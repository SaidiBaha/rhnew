import { useState, useMemo, type FormEvent } from "react";
import Swal from "sweetalert2";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

import { useCreatePermutation } from "../hooks/useCreatePermutation";
import type { PermutationCreatePayload, Permutation } from "../types";

import { useFetchEmployees } from "@/modules/employee/hooks/useFetchEmployees";
import { useFetchSupervisors } from "@/modules/employee/hooks/useFetchSupervisors";
import { useFetchPermutations } from "@/modules/permutation/hooks/useFetchPermutations";
import { useFetchProductionLines } from "@/modules/permutation/hooks/useFetchProductionLines";

import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";

type Props = {
    onCreated?: () => void;
};

export function PermutationForm({ onCreated }: Props) {
    const [operatorsSearch, setOperatorsSearch] = useState("");

    const {
        data: employees,
        isLoading: empLoading,
        isFetching: empFetching,
        error: empError,
    } = useFetchEmployees();

    const {
        data: supervisors,
        isLoading: supLoading,
        isFetching: supFetching,
        error: supError,
    } = useFetchSupervisors();

    const {
        data: permutationsData,
        isLoading: permLoading,
        isFetching: permFetching,
    } = useFetchPermutations();

    const {
        data: productionLines,
        isLoading: plLoading,
        isFetching: plFetching,
        error: plError,
    } = useFetchProductionLines();

    const { mutateAsync, isPending } = useCreatePermutation();

    const today = new Date().toISOString().slice(0, 10);

    const [receiverId, setReceiverId] = useState<number | "">("");
    const [productionLineId, setProductionLineId] = useState<number | "">("");
    const [operatorIds, setOperatorIds] = useState<number[]>([]);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("11:00");

    const operators = employees ?? [];
    const permutations: Permutation[] = permutationsData ?? [];
    const lines = productionLines ?? [];

    const unavailableOperatorIds = useMemo(() => {
        const result = new Set<number>();
        if (!startDate || !endDate || !startTime || !endTime) return result;

        permutations.forEach((p) => {
            if (p.status !== "ACCEPTEE") return;

            const datesOverlap = p.startDate <= endDate && p.endDate >= startDate;
            const timesOverlap = p.startTime < endTime && p.endTime > startTime;

            if (datesOverlap && timesOverlap) {
                p.operatorIds.forEach((opId) => result.add(opId));
            }
        });

        return result;
    }, [permutations, startDate, endDate, startTime, endTime]);

    const searchTerm = operatorsSearch.trim().toLowerCase();

    const filteredOperators = useMemo(
        () =>
            operators.filter((emp) => {
                if (unavailableOperatorIds.has(emp.id)) return false;
                if (!searchTerm) return true;

                const fullName = (emp.fullName ?? "").toLowerCase();
                const matricule = (emp.matricule ?? "").toLowerCase();
                const idStr = String(emp.id);

                return (
                    fullName.includes(searchTerm) ||
                    matricule.includes(searchTerm) ||
                    idStr.includes(searchTerm)
                );
            }),
        [operators, unavailableOperatorIds, searchTerm]
    );

    const toggleOperator = (id: number) => {
        setOperatorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    if (
        empLoading ||
        empFetching ||
        supLoading ||
        supFetching ||
        permLoading ||
        permFetching ||
        plLoading ||
        plFetching
    ) {
        return <Loader />;
    }

    if (empError || supError || plError) {
        return (
            <ErrorAlert
                error={
                    (empError as any)?.message ||
                    (supError as any)?.message ||
                    (plError as any)?.message ||
                    "Impossible de charger les données."
                }
            />
        );
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!receiverId) {
            await Swal.fire({
                icon: "warning",
                title: "Superviseur manquant",
                text: "Veuillez sélectionner un superviseur receveur.",
                confirmButtonColor: "#10b981",
            });
            return;
        }

        if (!productionLineId) {
            await Swal.fire({
                icon: "warning",
                title: "Projet manquant",
                text: "Veuillez sélectionner le projet / la ligne de production.",
                confirmButtonColor: "#10b981",
            });
            return;
        }

        if (operatorIds.length === 0) {
            await Swal.fire({
                icon: "warning",
                title: "Aucun opérateur sélectionné",
                text: "Veuillez sélectionner au moins un opérateur.",
                confirmButtonColor: "#10b981",
            });
            return;
        }

        if (endDate < startDate) {
            await Swal.fire({
                icon: "error",
                title: "Dates invalides",
                text: "La date de fin doit être supérieure ou égale à la date de début.",
                confirmButtonColor: "#ef4444",
            });
            return;
        }

        if (endTime <= startTime) {
            await Swal.fire({
                icon: "error",
                title: "Heures invalides",
                text: "L'heure de fin doit être strictement supérieure à l'heure de début.",
                confirmButtonColor: "#ef4444",
            });
            return;
        }

        const payload: PermutationCreatePayload = {
            receiverId: Number(receiverId),
            operatorIds,
            productionLineId: Number(productionLineId),
            startDate,
            endDate,
            startTime,
            endTime,
        };

        try {
            await mutateAsync(payload);

            await Swal.fire({
                icon: "success",
                title: "Permutation créée",
                text: "La permutation a été créée avec succès.",
                confirmButtonColor: "#10b981",
            });

            setReceiverId("");
            setProductionLineId("");
            setOperatorIds([]);
            setStartDate(today);
            setEndDate(today);
            setStartTime("09:00");
            setEndTime("11:00");
            setOperatorsSearch("");

            onCreated?.();
        } catch (err: any) {
            const backendMessage =
                err?.response?.data?.message ||
                err?.message ||
                "Erreur lors de la création de la permutation.";

            await Swal.fire({
                icon: "error",
                title: "Erreur serveur",
                text: backendMessage,
                confirmButtonColor: "#ef4444",
            });
        }
    };

    const selectedOperatorsCount = operatorIds.length;

    const labelCls = "mb-1 block text-xs font-semibold text-slate-600";
    const inputCls =
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none " +
        "transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";
    const sectionCls =
        "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            {/* INFORMATIONS GENERALES */}
            <div className={sectionCls}>
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Informations générales
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className={labelCls}>Récepteur (superviseur)</label>
                        <select
                            className={`${inputCls} ${receiverId ? "" : ""}`}
                            value={receiverId}
                            onChange={(e) =>
                                setReceiverId(e.target.value ? Number(e.target.value) : ("" as any))
                            }
                        >
                            <option value="">-- Sélectionner --</option>
                            {supervisors!.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>Projet / ligne de production</label>
                        <select
                            className={inputCls}
                            value={productionLineId}
                            onChange={(e) =>
                                setProductionLineId(e.target.value ? Number(e.target.value) : ("" as any))
                            }
                        >
                            <option value="">-- Sélectionner --</option>
                            {lines.map((line) => (
                                <option key={line.id} value={line.id}>
                                    {line.name ?? (line as any).label ?? `Ligne #${line.id}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>Date de début</label>
                        <input
                            type="date"
                            className={inputCls}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Date de fin</label>
                        <input
                            type="date"
                            className={inputCls}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* HORAIRES */}
            <div className={sectionCls}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Horaires
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className={labelCls}>Heure de début</label>
                        <input
                            type="time"
                            className={inputCls}
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Heure de fin</label>
                        <input
                            type="time"
                            className={inputCls}
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* OPERATEURS */}
            <div className={sectionCls}>
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Opérateurs concernés
                    </p>

                    <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                            selectedOperatorsCount === 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-emerald-600 text-white"
                        }`}
                    >
            {selectedOperatorsCount === 0
                ? "Aucun opérateur sélectionné"
                : `${selectedOperatorsCount} sélectionné${selectedOperatorsCount > 1 ? "s" : ""}`}
          </span>
                </div>

                <div className="mb-3">
                    <input
                        type="text"
                        value={operatorsSearch}
                        onChange={(e) => setOperatorsSearch(e.target.value)}
                        placeholder="Rechercher par nom, matricule ou id..."
                        className={inputCls}
                    />
                </div>

                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {filteredOperators.length === 0 && (
                        <p className="text-xs text-slate-400">
                            Aucun opérateur disponible pour cette période / recherche.
                        </p>
                    )}

                    {filteredOperators.map((emp) => {
                         console.log(emp.fullName, emp.free, typeof emp.free);
                        const checked = operatorIds.includes(emp.id);
                        const matricule = emp.matricule ?? "";

                        return (
                            <label
                                key={emp.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 shadow-sm transition ${
                                    checked
                                        ? "border-emerald-300 bg-emerald-50"
                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleOperator(emp.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />

                              <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
        <p className="truncate text-sm font-bold text-slate-900">
            {emp.fullName}
        </p>

        {emp.free ? (
            <CheckCircleIcon
                className="h-4 w-4 text-emerald-600"
                title="Opérateur libre"
            />
        ) : (
            <XCircleIcon
                className="h-4 w-4 text-red-500"
                title="Opérateur non libre"
            />
        )}
    </div>

    {matricule && (
        <p className="text-[11px] font-semibold uppercase text-slate-400">
            Matricule : {matricule}
        </p>
    )}
</div>

                            </label>
                        );
                    })}
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                    Cochez chaque opérateur concerné par cette permutation.
                </p>
            </div>

            {/* FOOTER BUTTON */}
            <div className="flex justify-end pt-1">
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-11 rounded-full bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                    {isPending ? "Création..." : "Créer la permutation"}
                </button>
            </div>
        </form>
    );
}
