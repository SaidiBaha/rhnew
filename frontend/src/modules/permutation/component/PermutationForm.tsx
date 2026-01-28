import { useState, useMemo, type FormEvent, useEffect } from "react";
import Swal from "sweetalert2";
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";

import { useCreatePermutation } from "../hooks/useCreatePermutation";
import type { PermutationCreatePayload, Permutation } from "../types";

import { useFetchEmployees } from "@/modules/employee/hooks/useFetchEmployees";
import { useFetchFreeEmployees } from "@/modules/employee/hooks/useFetchFreeEmployees";
import { useFetchSupervisors } from "@/modules/employee/hooks/useFetchSupervisors";
import { useFetchPermutations } from "@/modules/permutation/hooks/useFetchPermutations";
import { useFetchProductionLines } from "@/modules/permutation/hooks/useFetchProductionLines";

import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import useAuth from "@/hooks/useAuth"; // Importez useAuth

type Props = {
    onCreated?: () => void;
    mode?: "send" | "choose";
};

type AvailabilityFilter = "all" | "free" | "occupied";
type OperationMode = "send" | "receive";

export function PermutationForm({ onCreated, mode = "send" }: Props) {
    const [operatorsSearch, setOperatorsSearch] = useState("");
    const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
    const [operationMode, setOperationMode] = useState<OperationMode>("send");
    
    // Récupérez l'utilisateur connecté
    const { auth } = useAuth();
    const connectedUser = auth?.user;
    const isSupervisor = connectedUser?.role === "SUPERVISOR";

    const {
        data: employees,
        isLoading: empLoading,
        isFetching: empFetching,
        error: empError,
        refetch: refetchEmployees
    } = useFetchEmployees({ includeAll: mode === "choose" });

    const {
        data: freeEmployees,
        isLoading: freeEmpLoading,
        isFetching: freeEmpFetching,
        error: freeEmpError,
        refetch: refetchFreeEmployees
    } = useFetchFreeEmployees();

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

    // Effet pour initialiser le récepteur avec l'utilisateur connecté en mode "recevoir"
    useEffect(() => {
        if (operationMode === "receive" && connectedUser && isSupervisor) {
            // Convertir l'ID de l'utilisateur en nombre
            const userId = Number(connectedUser.id);
            setReceiverId(userId);
        } else if (operationMode === "send") {
            // Réinitialiser en mode "envoyer"
            setReceiverId("");
        }
    }, [operationMode, connectedUser, isSupervisor]);

    // Trouver si l'utilisateur connecté est dans la liste des superviseurs
    const currentUserSupervisor = useMemo(() => {
        if (!connectedUser || !supervisors) return null;
        
        const userId = Number(connectedUser.id);
        return supervisors.find(sup => sup.id === userId);
    }, [connectedUser, supervisors]);

    // Déterminer quelle liste d'opérateurs utiliser selon le mode
    const allOperators = employees ?? [];
    const freeOperatorsList = freeEmployees ?? [];
    
    const operators = operationMode === "receive" ? freeOperatorsList : allOperators;
    
    const permutations: Permutation[] = permutationsData ?? [];
    const lines = productionLines ?? [];

    const unavailableOperatorIds = useMemo(() => {
        if (operationMode === "receive") return new Set<number>();
        
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
    }, [permutations, startDate, endDate, startTime, endTime, operationMode]);

    const operatorAvailability = useMemo(() => {
        const result = new Map<number, boolean>();
        
        operators.forEach((emp) => {
            if (operationMode === "receive") {
                result.set(emp.id, true);
            } else {
                const isUnavailable = unavailableOperatorIds.has(emp.id);
                const isFreeFromData = emp.free === true;
                const isFree = !isUnavailable && isFreeFromData;
                result.set(emp.id, isFree);
            }
        });
        
        return result;
    }, [operators, unavailableOperatorIds, operationMode]);

    const availabilityStats = useMemo(() => {
        const allCount = operators.length;
        
        if (operationMode === "receive") {
            return { allCount, freeCount: allCount, occupiedCount: 0 };
        }
        
        const freeCount = operators.filter(emp => {
            const isFree = operatorAvailability.get(emp.id) ?? true;
            return isFree;
        }).length;
        const occupiedCount = allCount - freeCount;
        
        return { allCount, freeCount, occupiedCount };
    }, [operators, operatorAvailability, operationMode]);

    const searchTerm = operatorsSearch.trim().toLowerCase();

    const filteredOperators = useMemo(
        () =>
            operators.filter((emp) => {
                if (searchTerm) {
                    const fullName = (emp.fullName ?? "").toLowerCase();
                    const matricule = (emp.matricule ?? "").toLowerCase();
                    const idStr = String(emp.id);

                    const matchesSearch = 
                        fullName.includes(searchTerm) ||
                        matricule.includes(searchTerm) ||
                        idStr.includes(searchTerm);
                    
                    if (!matchesSearch) return false;
                }

                if (operationMode === "receive") return true;

                const isFree = operatorAvailability.get(emp.id) ?? true;
                
                switch (availabilityFilter) {
                    case "free":
                        return isFree;
                    case "occupied":
                        return !isFree;
                    case "all":
                    default:
                        return true;
                }
            }),
        [operators, operatorAvailability, searchTerm, availabilityFilter, operationMode]
    );

    const toggleOperator = (id: number) => {
        setOperatorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const labelCls = "mb-1 block text-xs font-semibold text-slate-600";
    const inputCls =
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none " +
        "transition focus:border-[#6b7a12] focus:ring-2 focus:ring-[#6b7a12]/20";
    const sectionCls =
        "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";
    
    const filterButtonCls = (isActive: boolean, color: "green" | "red" = "green") =>
        `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
            isActive
                ? color === "green" 
                    ? "bg-[#6b7a12] text-white" 
                    : "bg-red-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`;

    const selectedOperatorsCount = operatorIds.length;

    const handleOperationModeChange = (mode: OperationMode) => {
        setOperationMode(mode);
        setOperatorIds([]);
        setAvailabilityFilter("all");
        
        if (mode === "receive") {
            refetchFreeEmployees();
            // Si l'utilisateur connecté est superviseur, le pré-sélectionner
            if (connectedUser && isSupervisor) {
                const userId = Number(connectedUser.id);
                setReceiverId(userId);
            }
        } else {
            refetchEmployees();
            setReceiverId("");
        }
    };

    const isLoading =
        (operationMode === "send" && (empLoading || empFetching)) ||
        (operationMode === "receive" && (freeEmpLoading || freeEmpFetching)) ||
        supLoading ||
        supFetching ||
        permLoading ||
        permFetching ||
        plLoading ||
        plFetching;

    if (isLoading) {
        return <Loader />;
    }

    if ((operationMode === "send" && empError) || 
        (operationMode === "receive" && freeEmpError) || 
        supError || 
        plError) {
        return (
            <ErrorAlert
                error={
                    (empError as any)?.message ||
                    (freeEmpError as any)?.message ||
                    (supError as any)?.message ||
                    (plError as any)?.message ||
                    "Impossible de charger les données."
                }
            />
        );
    }

    // Validation du formulaire adaptée
    const validateForm = () => {
        if (!receiverId) {
            Swal.fire({
                icon: "warning",
                title: "Superviseur manquant",
                text: "Veuillez sélectionner un superviseur receveur.",
                confirmButtonColor: "#6b7a12",
            });
            return false;
        }

        if (!productionLineId) {
            Swal.fire({
                icon: "warning",
                title: "Projet manquant",
                text: "Veuillez sélectionner le projet / la ligne de production.",
                confirmButtonColor: "#6b7a12",
            });
            return false;
        }

        if (operatorIds.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "Aucun opérateur sélectionné",
                text: "Veuillez sélectionner au moins un opérateur.",
                confirmButtonColor: "#6b7a12",
            });
            return false;
        }

        if (endDate < startDate) {
            Swal.fire({
                icon: "error",
                title: "Dates invalides",
                text: "La date de fin doit être supérieure ou égale à la date de début.",
                confirmButtonColor: "#ef4444",
            });
            return false;
        }

        if (mode === "send" && endTime <= startTime) {
            Swal.fire({
                icon: "error",
                title: "Heures invalides",
                text: "L'heure de fin doit être strictement supérieure à l'heure de début.",
                confirmButtonColor: "#ef4444",
            });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

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
                text: `La permutation a été créée avec succès.`,
                confirmButtonColor: "#6b7a12",
            });

            // Réinitialiser le formulaire
            setReceiverId(operationMode === "receive" && connectedUser && isSupervisor 
                ? Number(connectedUser.id) 
                : "");
            setProductionLineId("");
            setOperatorIds([]);
            setStartDate(today);
            setEndDate(today);
            setStartTime("09:00");
            setEndTime("11:00");
            setOperatorsSearch("");
            setAvailabilityFilter("all");

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

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            {/* SWITCH ENVOYER/RECEVOIR */}
            <div className={sectionCls}>
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Type d'opération
                    </p>
                </div>
                
                <div className="flex rounded-xl bg-slate-100 p-1">
                    <button
                        type="button"
                        onClick={() => handleOperationModeChange("send")}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                            operationMode === "send"
                                ? "bg-white text-[#6b7a12] shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <ArrowRightIcon className="h-4 w-4" />
                        Envoyer un employé
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => handleOperationModeChange("receive")}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                            operationMode === "receive"
                                ? "bg-white text-[#6b7a12] shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Recevoir un employé
                    </button>
                </div>
                
                <p className="mt-2 text-xs text-slate-500">
                    {operationMode === "send" 
                        ? "Sélectionnez les employés à envoyer vers un autre projet"
                        : "Sélectionnez les employés libres à recevoir sur votre projet"}
                </p>
            </div>

            {/* INFORMATIONS GENERALES */}
            <div className={sectionCls}>
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Informations générales
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className={labelCls}>
                            {operationMode === "send" 
                                ? "Récepteur (superviseur)" 
                                : "Récepteur (vous)"}
                        </label>
                        
                        {operationMode === "receive" && currentUserSupervisor ? (
                            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {currentUserSupervisor.fullName}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Matricule: {currentUserSupervisor.matricule}
                                    </p>
                                </div>
                                <span className="rounded-full bg-[#6b7a12] px-2 py-1 text-xs font-bold text-white">
                                    Vous
                                </span>
                            </div>
                        ) : (
                            <select
                                className={`${inputCls} ${receiverId ? "" : ""}`}
                                value={receiverId}
                                onChange={(e) =>
                                    setReceiverId(e.target.value ? Number(e.target.value) : ("" as any))
                                }
                                disabled={operationMode === "receive" && currentUserSupervisor}
                            >
                                <option value="">-- Sélectionner --</option>
                                {supervisors!.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.fullName}
                                    </option>
                                ))}
                            </select>
                        )}
                        
                        {operationMode === "receive" && !currentUserSupervisor && (
                            <p className="mt-1 text-xs text-amber-600">
                                Vous n'êtes pas identifié comme superviseur dans la liste.
                            </p>
                        )}
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
                        <label className={labelCls}>Date de début***</label>
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

            {/* HORAIRES - Visible seulement en mode "send" */}
            {mode === "send" && (
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
            )}

            {/* OPERATEURS */}
            <div className={sectionCls}>
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        {operationMode === "send" 
                            ? "Opérateurs à envoyer" 
                            : "Opérateurs disponibles à recevoir"}
                    </p>

                    <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                            selectedOperatorsCount === 0
                                ? "bg-[#6b7a12]/10 text-[#6b7a12]"
                                : "bg-[#6b7a12] text-white"
                        }`}
                    >
                        {selectedOperatorsCount === 0
                            ? "Aucun opérateur sélectionné"
                            : `${selectedOperatorsCount} sélectionné${selectedOperatorsCount > 1 ? "s" : ""}`}
                    </span>
                </div>

                <div className="mb-3 space-y-3">
                    <input
                        type="text"
                        value={operatorsSearch}
                        onChange={(e) => setOperatorsSearch(e.target.value)}
                        placeholder="Rechercher par nom, matricule ou id..."
                        className={inputCls}
                    />
                    
                    {operationMode === "send" && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">Filtrer par :</span>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setAvailabilityFilter("all")}
                                    className={filterButtonCls(availabilityFilter === "all")}
                                >
                                    Tous
                                    <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                                        availabilityFilter === "all"
                                            ? "bg-white/20"
                                            : "bg-slate-300 text-slate-700"
                                    }`}>
                                        {availabilityStats.allCount}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAvailabilityFilter("free")}
                                    className={filterButtonCls(availabilityFilter === "free")}
                                >
                                    Libre
                                    <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                                        availabilityFilter === "free"
                                            ? "bg-white/20"
                                            : "bg-[#6b7a12]/10 text-[#6b7a12]"
                                    }`}>
                                        {availabilityStats.freeCount}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAvailabilityFilter("occupied")}
                                    className={filterButtonCls(availabilityFilter === "occupied", "red")}
                                >
                                    Occupé
                                    <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                                        availabilityFilter === "occupied"
                                            ? "bg-white/20"
                                            : "bg-red-100 text-red-600"
                                    }`}>
                                        {availabilityStats.occupiedCount}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {operationMode === "receive" && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            <span className="text-xs font-medium text-green-700">
                                Liste des opérateurs actuellement libres (disponibles)
                            </span>
                        </div>
                    )}
                </div>

                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {filteredOperators.length === 0 && (
                        <p className="text-xs text-slate-400">
                            {operationMode === "send" 
                                ? "Aucun opérateur disponible pour cette période / recherche."
                                : "Aucun opérateur libre disponible pour le moment."}
                        </p>
                    )}

                    {filteredOperators.map((emp) => {
                        const checked = operatorIds.includes(emp.id);
                        const matricule = emp.matricule ?? "";
                        const isFree = operatorAvailability.get(emp.id) ?? true;

                        return (
                            <label
                                key={emp.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 shadow-sm transition ${
                                    checked
                                        ? "border-[#6b7a12] bg-[#6b7a12]/5"
                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleOperator(emp.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-[#6b7a12] focus:ring-[#6b7a12]"
                                />

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-bold text-slate-900">
                                            {emp.fullName}
                                        </p>
                                        
                                        {operationMode === "send" && (
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                isFree
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                            }`}>
                                                {isFree ? (
                                                    <>
                                                        <CheckCircleIcon className="h-3 w-3" />
                                                        Libre
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircleIcon className="h-3 w-3" />
                                                        Occupé
                                                    </>
                                                )}
                                            </span>
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
                    {operationMode === "send"
                        ? "Cochez chaque opérateur concerné par cette permutation."
                        : "Sélectionnez les opérateurs libres que vous souhaitez intégrer à votre projet."}
                </p>
            </div>

            {/* FOOTER BUTTON */}
            <div className="flex justify-end pt-1">
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-11 rounded-full bg-[#6b7a12] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#5a6610] disabled:opacity-60"
                >
                    {isPending 
                        ? "Création..." 
                        : operationMode === "send" 
                            ? "Envoyer les opérateurs" 
                            : "Recevoir les opérateurs"}
                </button>
            </div>
        </form>
    );
}