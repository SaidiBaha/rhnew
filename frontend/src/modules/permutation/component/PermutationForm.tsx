import { useState, useMemo, type FormEvent, useEffect } from "react";
import Swal from "sweetalert2";
import {
    CheckCircleIcon,
    XCircleIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    UserCircleIcon,
} from "@heroicons/react/24/solid";

import { useCreatePermutation } from "../hooks/useCreatePermutation";
import type { PermutationCreatePayload, Permutation, TypePermutation } from "../types";

import { useFetchEmployees } from "@/modules/employee/hooks/useFetchEmployees";
import { useFetchFreeEmployees } from "@/modules/employee/hooks/useFetchFreeEmployees";
import { useFetchSupervisors } from "@/modules/employee/hooks/useFetchSupervisors";
import { useFetchPermutations } from "@/modules/permutation/hooks/useFetchPermutations";
import { useFetchProductionLines } from "@/modules/permutation/hooks/useFetchProductionLines";

import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import useAuth from "@/hooks/useAuth";

// Type local adapté à la structure réelle des données
interface EmployeeLocal {
  id: number;
  fullName: string;
  matricule: string;
  free?: boolean;
  supervisorFullName?: string;
  supervisor?: {
    fullName: string;
  };
  [key: string]: any; // Pour les propriétés supplémentaires
}

type Props = {
    onCreated?: () => void;
    mode?: "send" | "choose";
};

type AvailabilityFilter = "all" | "free" | "occupied";

/* =========================
   ✅ Helpers (LOCAL DATE + SHIFT)
   ========================= */
function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function toDateStrLocal(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Règles horaires (selon heure actuelle):
 * - 06:00 <= now < 14:00 => 06:00 → 14:00 (today → today)
 * - 14:00 <= now < 22:00 => 14:00 → 22:00 (today → today)
 * - sinon => 22:00 → 06:00 (today → tomorrow)
 */
function getTodayShiftWindow(now = new Date()) {
    const h = now.getHours();
    const m = now.getMinutes();
    const minutes = h * 60 + m;

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayStr = toDateStrLocal(today);
    const tomorrowStr = toDateStrLocal(tomorrow);

    if (minutes >= 6 * 60 && minutes < 14 * 60) {
        return { startDate: todayStr, endDate: todayStr, startTime: "06:00", endTime: "14:00" };
    }
    if (minutes >= 14 * 60 && minutes < 22 * 60) {
        return { startDate: todayStr, endDate: todayStr, startTime: "14:00", endTime: "22:00" };
    }
    return { startDate: todayStr, endDate: tomorrowStr, startTime: "22:00", endTime: "06:00" };
}

function splitTimeRangeByMidnight(startTime: string, endTime: string) {
    // ex: 06:00 -> 14:00
    if (endTime > startTime) return [{ startTime, endTime }];

    // overnight: 22:00 -> 06:00
    return [
        { startTime, endTime: "23:59" },
        { startTime: "00:00", endTime },
    ];
}

export function PermutationForm({ onCreated, mode = "send" }: Props) {
    const [operatorsSearch, setOperatorsSearch] = useState("");
    const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
    const [typePermutation, setTypePermutation] = useState<TypePermutation>("ENVOYER");

    // ── Recherche superviseur ──
    const [supervisorSearch, setSupervisorSearch] = useState("");
    const [supervisorOpen, setSupervisorOpen] = useState(false);

    // ── Recherche ligne de production ──
    const [lineSearch, setLineSearch] = useState("");
    const [lineOpen, setLineOpen] = useState(false);

    const { auth } = useAuth();
    const connectedUser = auth.user;

    const [senderId, setSenderId] = useState<number | "">("");
    const [receiverId, setReceiverId] = useState<number | "">("");

    const [productionLineId, setProductionLineId] = useState<number | "">("");
    const [operatorIds, setOperatorIds] = useState<number[]>([]);

    // ✅ Today (LOCAL) + shift (used for ENVOYER auto)
    const todayStr = useMemo(() => toDateStrLocal(new Date()), []);
    const initialShift = useMemo(() => getTodayShiftWindow(new Date()), []);

    const [startDate, setStartDate] = useState(initialShift.startDate);
    const [endDate, setEndDate] = useState(initialShift.endDate);

    const [startTime, setStartTime] = useState(initialShift.startTime);
    const [endTime, setEndTime] = useState(initialShift.endTime);

    const {
        data: employees,
        isLoading: empLoading,
        isFetching: empFetching,
        error: empError,
        refetch: refetchEmployees,
    } = useFetchEmployees({ includeAll: mode === "choose" });

    const {
        data: freeEmployees,
        isLoading: freeEmpLoading,
        isFetching: freeEmpFetching,
        error: freeEmpError,
        refetch: refetchFreeEmployees,
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

    // Déterminer quelle liste d'opérateurs utiliser selon le type
    const allOperators = (employees ?? []) as EmployeeLocal[];
    const freeOperatorsList = (freeEmployees ?? []) as EmployeeLocal[];
    const operators = typePermutation === "RECEVOIR" ? freeOperatorsList : allOperators;

    const permutations: Permutation[] = permutationsData ?? [];
    const lines = productionLines ?? [];

    // ── Superviseurs filtrés (par nom ou matricule) ──
    const filteredSupervisors = useMemo(() => {
        const term = supervisorSearch.trim().toLowerCase();
        const base = ((supervisors as EmployeeLocal[]) ?? []).filter((emp: EmployeeLocal) =>
            connectedUser ? emp.id !== Number(connectedUser.id) : true
        );
        if (!term) return base;
        return base.filter((emp: EmployeeLocal) =>
            (emp.fullName ?? "").toLowerCase().includes(term) ||
            (emp.matricule ?? "").toLowerCase().includes(term)
        );
    }, [supervisors, supervisorSearch, connectedUser]);

    const selectedSupervisor = useMemo(() =>
        ((supervisors as EmployeeLocal[]) ?? []).find((e: EmployeeLocal) => e.id === receiverId) ?? null,
        [supervisors, receiverId]
    );

    // ── Lignes filtrées (par nom) ──
    const filteredLines = useMemo(() => {
        const term = lineSearch.trim().toLowerCase();
        if (!term) return lines;
        return lines.filter((line: any) =>
            (line.name ?? line.label ?? "").toLowerCase().includes(term)
        );
    }, [lines, lineSearch]);

    const selectedLine = useMemo(() =>
        lines.find((l: any) => l.id === productionLineId) ?? null,
        [lines, productionLineId]
    );

    // ✅ Initialisation IDs + dates selon le type
    useEffect(() => {
        if (!connectedUser?.id) return;

        if (typePermutation === "RECEVOIR") {
            // receiver = moi (affichage seulement)
            setReceiverId(Number(connectedUser.id));
            setSenderId("");

            // ✅ RECEVOIR = uniquement aujourd'hui
            setStartDate(todayStr);
            setEndDate(todayStr);

            // (heures: on garde, car pas nécessaires côté RECEVOIR, mais on peut les laisser telles quelles)
            refetchFreeEmployees();
        } else {
            // ✅ ENVOYER = uniquement aujourd'hui + horaires auto-shift (et fin demain si 22->06)
            setSenderId(Number(connectedUser.id));
            setReceiverId("");

            const w = getTodayShiftWindow(new Date());
            setStartDate(w.startDate); // always today
            setEndDate(w.endDate);     // today OR tomorrow (overnight)
            setStartTime(w.startTime); // 06/14/22
            setEndTime(w.endTime);     // 14/22/06

            refetchEmployees();
        }

        // reset opérateurs / filtres
        setOperatorIds([]);
        setAvailabilityFilter("all");
        setOperatorsSearch("");
        setSupervisorSearch("");
        setLineSearch("");
    }, [typePermutation, connectedUser, todayStr, refetchEmployees, refetchFreeEmployees]);

    // ✅ Disponibilité uniquement en ENVOYER (avec support overnight)
    const unavailableOperatorIds = useMemo(() => {
        if (typePermutation === "RECEVOIR") return new Set<number>();

        const result = new Set<number>();
        if (!startDate || !endDate || !startTime || !endTime) return result;

        const ranges = splitTimeRangeByMidnight(startTime, endTime);

        permutations.forEach((p) => {
            if (p.status !== "ACCEPTEE") return;

            const datesOverlap = p.startDate <= endDate && p.endDate >= startDate;
            if (!datesOverlap) return;

            const timesOverlap = ranges.some((r) => p.startTime < r.endTime && p.endTime > r.startTime);

            if (timesOverlap) {
                p.operatorIds.forEach((opId) => result.add(opId));
            }
        });

        return result;
    }, [permutations, startDate, endDate, startTime, endTime, typePermutation]);

    const operatorAvailability = useMemo(() => {
        const result = new Map<number, boolean>();

        operators.forEach((emp: EmployeeLocal) => {
            if (typePermutation === "RECEVOIR") {
                result.set(emp.id, true);
            } else {
                const isUnavailable = unavailableOperatorIds.has(emp.id);
                const isFreeFromData = emp.free === true;
                const isFree = !isUnavailable && isFreeFromData;
                result.set(emp.id, isFree);
            }
        });

        return result;
    }, [operators, unavailableOperatorIds, typePermutation]);

    const availabilityStats = useMemo(() => {
        const allCount = operators.length;

        if (typePermutation === "RECEVOIR") {
            return { allCount, freeCount: allCount, occupiedCount: 0 };
        }

        const freeCount = operators.filter((emp: EmployeeLocal) => (operatorAvailability.get(emp.id) ?? true)).length;
        const occupiedCount = allCount - freeCount;

        return { allCount, freeCount, occupiedCount };
    }, [operators, operatorAvailability, typePermutation]);

    const searchTerm = operatorsSearch.trim().toLowerCase();

    const filteredOperators = useMemo(
        () =>
            operators.filter((emp: EmployeeLocal) => {
                if (searchTerm) {
                    const fullName = (emp.fullName ?? "").toLowerCase();
                    const matricule = (emp.matricule ?? "").toLowerCase();
                    const idStr = String(emp.id);

                    const matchesSearch =
                        fullName.includes(searchTerm) || matricule.includes(searchTerm) || idStr.includes(searchTerm);

                    if (!matchesSearch) return false;
                }

                if (typePermutation === "RECEVOIR") return true;

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
        [operators, operatorAvailability, searchTerm, availabilityFilter, typePermutation]
    );

    const toggleOperator = (id: number) => {
        setOperatorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const labelCls = "mb-1.5 block text-xs font-semibold" ;
    const labelStyle = { color: "var(--text-2)" };
    const inputCls = "ds-input h-10 w-full";
    const sectionCls = "ds-card p-5";

    const filterButtonCls = (isActive: boolean, color: "green" | "red" = "green") =>
        `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
            isActive
                ? color === "green"
                    ? "ds-btn-primary"
                    : "bg-red-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`;

    const selectedOperatorsCount = operatorIds.length;

    const handleTypePermutationChange = (type: TypePermutation) => {
        setTypePermutation(type);
    };

    const isLoading =
        (typePermutation === "ENVOYER" && (empLoading || empFetching)) ||
        (typePermutation === "RECEVOIR" && (freeEmpLoading || freeEmpFetching)) ||
        supLoading ||
        supFetching ||
        permLoading ||
        permFetching ||
        plLoading ||
        plFetching;

    if (isLoading) return <Loader />;

    if (
        (typePermutation === "ENVOYER" && empError) ||
        (typePermutation === "RECEVOIR" && freeEmpError) ||
        supError ||
        plError
    ) {
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // ✅ ENVOYER : receiver obligatoire
        if (typePermutation === "ENVOYER") {
            if (!receiverId) {
                await Swal.fire({
                    icon: "warning",
                    title: "Destinataire manquant",
                    text: "Veuillez sélectionner un superviseur destinataire.",
                    confirmButtonColor: "#e85d26",
                });
                return;
            }

            if (senderId && receiverId && Number(senderId) === Number(receiverId)) {
                await Swal.fire({
                    icon: "warning",
                    title: "Destinataire invalide",
                    text: "Vous ne pouvez pas vous envoyer des opérateurs à vous-même.",
                    confirmButtonColor: "#e85d26",
                });
                return;
            }

        }

        if (!productionLineId) {
            await Swal.fire({
                icon: "warning",
                title: "Projet manquant",
                text: "Veuillez sélectionner le projet / la ligne de production.",
                confirmButtonColor: "#e85d26",
            });
            return;
        }

        if (operatorIds.length === 0) {
            await Swal.fire({
                icon: "warning",
                title: "Aucun opérateur sélectionné",
                text: "Veuillez sélectionner au moins un opérateur.",
                confirmButtonColor: "#e85d26",
            });
            return;
        }

        // ✅ dates globales
        if (endDate < startDate) {
            await Swal.fire({
                icon: "error",
                title: "Dates invalides",
                text: "La date de fin doit être supérieure ou égale à la date de début.",
                confirmButtonColor: "#ef4444",
            });
            return;
        }

        // ✅ Horaires (mode send uniquement)
        if (mode === "send") {
            const sameDay = startDate === endDate;

            // si même jour => endTime > startTime
            if (sameDay && endTime <= startTime) {
                await Swal.fire({
                    icon: "error",
                    title: "Heures invalides",
                    text: "L'heure de fin doit être strictement supérieure à l'heure de début.",
                    confirmButtonColor: "#ef4444",
                });
                return;
            }

            // si overnight => endDate > startDate (autorisé même si endTime <= startTime)
            if (!sameDay && endDate <= startDate) {
                await Swal.fire({
                    icon: "error",
                    title: "Dates invalides",
                    text: "En cas de shift nuit, la date de fin doit être demain.",
                    confirmButtonColor: "#ef4444",
                });
                return;
            }
        }

        const payload: PermutationCreatePayload = {
            operatorIds,
            productionLineId: Number(productionLineId),
            startDate,
            endDate,
            startTime,
            endTime,
            typePermutation,
            receiverId: null,
        };

        if (typePermutation === "ENVOYER") {
            payload.receiverId = receiverId ? Number(receiverId) : null;
        } else {
            payload.receiverId = null;
        }

        try {
            await mutateAsync(payload);

            await Swal.fire({
                icon: "success",
                title: "Permutation créée",
                text: "La permutation a été créée avec succès.",
                confirmButtonColor: "#e85d26",
            });

            // Reset
            setProductionLineId("");
            setLineSearch("");
            setOperatorIds([]);
            setOperatorsSearch("");
            setAvailabilityFilter("all");

            // ✅ reset dates/heures selon type (ENVOYER => shift auto / RECEVOIR => today)
            if (typePermutation === "ENVOYER") {
                const w = getTodayShiftWindow(new Date());
                setStartDate(w.startDate);
                setEndDate(w.endDate);
                setStartTime(w.startTime);
                setEndTime(w.endTime);
                setReceiverId("");
                setSupervisorSearch("");
            } else {
                setStartDate(todayStr);
                setEndDate(todayStr);
            }

            onCreated?.();
        } catch (err: any) {
            const backendMessage =
                err?.response?.data?.message || err?.message || "Erreur lors de la création de la permutation.";

            await Swal.fire({
                icon: "error",
                title: "Erreur serveur",
                text: backendMessage,
                confirmButtonColor: "#ef4444",
            });
        }
    };

    const canEditTimes = true;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* SWITCH ENVOYER/RECEVOIR */}
            <div className={sectionCls}>
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 pl-3" style={{ borderLeft: "3px solid var(--accent)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Type d'opération</p>
                    </div>

                    {connectedUser && (
                        <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: "var(--steel-light)", border: "1px solid var(--border)" }}>
                            <UserCircleIcon className="h-4 w-4" style={{ color: "var(--accent)" }} />
                            <span className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{connectedUser.fullName}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                                {connectedUser.role}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex rounded-xl bg-slate-100 p-1">
                    <button
                        type="button"
                        onClick={() => handleTypePermutationChange("ENVOYER")}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all"
                        style={typePermutation === "ENVOYER"
                            ? { background: "var(--surface)", color: "var(--accent)", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                            : { color: "var(--text-2)" }}
                    >
                        <ArrowRightIcon className="h-4 w-4" />
                        Envoyer
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTypePermutationChange("RECEVOIR")}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all"
                        style={typePermutation === "RECEVOIR"
                            ? { background: "var(--surface)", color: "var(--accent)", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                            : { color: "var(--text-2)" }}
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Recevoir
                    </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                    {typePermutation === "ENVOYER"
                        ? "Vous envoyez vos opérateurs à un autre projet (uniquement aujourd'hui, selon le shift actuel)"
                        : "Vous recevez des opérateurs libres (uniquement aujourd'hui)"}
                </p>
            </div>

            {/* INFORMATIONS GENERALES */}
            <div className={sectionCls}>
                <div className="mb-4 flex items-center gap-2 pl-3" style={{ borderLeft: "3px solid var(--accent)" }}>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Informations générales</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    {/* ✅ ENVOYER : choix destinataire avec recherche */}
                    {typePermutation === "ENVOYER" && (
                        <div>
                            <label className={labelCls} style={labelStyle}>
                                Destinataire (superviseur) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={`${inputCls} pr-8`}
                                    style={!receiverId ? { borderColor: "#fca5a5" } : { borderColor: "var(--accent)" }}
                                    placeholder="Rechercher par nom ou matricule…"
                                    value={supervisorOpen ? supervisorSearch : (selectedSupervisor ? `${selectedSupervisor.fullName} — ${selectedSupervisor.matricule}` : "")}
                                    onFocus={() => { setSupervisorOpen(true); setSupervisorSearch(""); }}
                                    onChange={(e) => setSupervisorSearch(e.target.value)}
                                    onBlur={() => setTimeout(() => setSupervisorOpen(false), 180)}
                                    autoComplete="off"
                                />
                                {receiverId && (
                                    <button
                                        type="button"
                                        onMouseDown={() => { setReceiverId(""); setSupervisorSearch(""); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        tabIndex={-1}
                                    >
                                        ✕
                                    </button>
                                )}
                                {supervisorOpen && (
                                    <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                                        {filteredSupervisors.length === 0 ? (
                                            <p className="px-3 py-3 text-xs text-slate-400">Aucun superviseur trouvé.</p>
                                        ) : (
                                            filteredSupervisors.map((emp: EmployeeLocal) => (
                                                <button
                                                    key={emp.id}
                                                    type="button"
                                                    onMouseDown={() => {
                                                        setReceiverId(emp.id);
                                                        setSupervisorOpen(false);
                                                        setSupervisorSearch("");
                                                    }}
                                                    className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                                                    style={receiverId === emp.id ? { background: "var(--accent-soft)" } : {}}
                                                >
                                                    <span className="text-sm font-semibold text-slate-900">{emp.fullName}</span>
                                                    <span className="text-xs text-slate-500">Matricule : {emp.matricule}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* production line */}
                    <div>
                        <label className={labelCls} style={labelStyle}>
                            Projet / ligne de production <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                className={`${inputCls} pr-8`}
                                style={!productionLineId ? { borderColor: "#fca5a5" } : { borderColor: "var(--accent)" }}
                                placeholder="Rechercher par nom de projet…"
                                value={lineOpen ? lineSearch : (selectedLine ? (selectedLine.name ?? selectedLine.label ?? `Ligne #${selectedLine.id}`) : "")}
                                onFocus={() => { setLineOpen(true); setLineSearch(""); }}
                                onChange={(e) => setLineSearch(e.target.value)}
                                onBlur={() => setTimeout(() => setLineOpen(false), 180)}
                                autoComplete="off"
                            />
                            {productionLineId && (
                                <button
                                    type="button"
                                    onMouseDown={() => { setProductionLineId(""); setLineSearch(""); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                    tabIndex={-1}
                                >
                                    ✕
                                </button>
                            )}
                            {lineOpen && (
                                <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                                    {filteredLines.length === 0 ? (
                                        <p className="px-3 py-3 text-xs text-slate-400">Aucun projet trouvé.</p>
                                    ) : (
                                        filteredLines.map((line: { id: number; name?: string; label?: string }) => (
                                            <button
                                                key={line.id}
                                                type="button"
                                                onMouseDown={() => {
                                                    setProductionLineId(line.id);
                                                    setLineOpen(false);
                                                    setLineSearch("");
                                                }}
                                                className="flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                                                style={productionLineId === line.id
                                                    ? { background: "var(--accent-soft)", fontWeight: 600, color: "var(--accent)" }
                                                    : { color: "var(--text-1)" }}
                                            >
                                                {line.name ?? line.label ?? `Ligne #${line.id}`}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* user card */}
                    <div>
                        <label className={labelCls} style={labelStyle}>
                            {typePermutation === "ENVOYER" ? "Émetteur" : "Destinataire"}
                            <span className="ml-1 text-[10px] text-slate-400">(vous)</span>
                        </label>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <UserCircleIcon className="h-5 w-5 text-slate-500" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{connectedUser?.fullName || "Utilisateur"}</p>
                                <p className="text-[11px] text-slate-500">Matricule: {connectedUser?.matricule || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* dates — même ligne, toujours 2 colonnes */}
                    <div className="col-span-2">
                        <label className={labelCls} style={labelStyle}>
                            Période <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <p className="mb-1 text-[10px] font-medium text-slate-400">Date de début</p>
                                <input
                                    type="date"
                                    className={inputCls}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <span className="mt-5 shrink-0 text-slate-300 text-lg">→</span>
                            <div className="flex-1">
                                <p className="mb-1 text-[10px] font-medium text-slate-400">Date de fin</p>
                                <input
                                    type="date"
                                    className={inputCls}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* HORAIRES - Visible seulement si mode = "send" */}
            {mode === "send" && (
                <div className={sectionCls}>
                    <div className="mb-4 flex items-center gap-2 pl-3" style={{ borderLeft: "3px solid var(--accent)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Horaires du shift</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className={labelCls} style={labelStyle}>
                                Heure de début <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                className={`${inputCls} ${!canEditTimes ? "bg-slate-100 text-slate-500" : ""}`}
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                                disabled={!canEditTimes}
                            />
                        </div>

                        <div>
                            <label className={labelCls} style={labelStyle}>
                                Heure de fin <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                className={`${inputCls} ${!canEditTimes ? "bg-slate-100 text-slate-500" : ""}`}
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                                disabled={!canEditTimes}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* OPERATEURS */}
            <div className={sectionCls}>
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 pl-3" style={{ borderLeft: "3px solid var(--accent)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                            {typePermutation === "ENVOYER" ? "Opérateurs à envoyer" : "Opérateurs libres disponibles"}
                        </p>
                    </div>

                    <span
                        className="rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
                        style={selectedOperatorsCount === 0
                            ? { background: "var(--steel-light)", color: "var(--text-3)" }
                            : { background: "var(--accent)", color: "#fff" }}
                    >
                        {selectedOperatorsCount === 0
                            ? "Aucune sélection"
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

                    {typePermutation === "ENVOYER" ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">Filtrer par :</span>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setAvailabilityFilter("all")}
                                    className={filterButtonCls(availabilityFilter === "all")}
                                >
                                    Tous
                                    <span
                                        className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                                            availabilityFilter === "all" ? "bg-white/20" : "bg-slate-300 text-slate-700"
                                        }`}
                                    >
                                        {availabilityStats.allCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAvailabilityFilter("free")}
                                    className={filterButtonCls(availabilityFilter === "free")}
                                >
                                    Libre
                                    <span
                                        className="inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full"
                                        style={availabilityFilter === "free"
                                            ? { background: "rgba(255,255,255,0.2)" }
                                            : { background: "var(--accent-soft)", color: "var(--accent)" }}
                                    >
                                        {availabilityStats.freeCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAvailabilityFilter("occupied")}
                                    className={filterButtonCls(availabilityFilter === "occupied", "red")}
                                >
                                    Occupé
                                    <span
                                        className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                                            availabilityFilter === "occupied" ? "bg-white/20" : "bg-red-100 text-red-600"
                                        }`}
                                    >
                                        {availabilityStats.occupiedCount}
                                    </span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            <span className="text-xs font-medium text-green-700">
                                Liste des opérateurs actuellement libres (aujourd&apos;hui)
                            </span>
                        </div>
                    )}
                </div>

                <div className="max-h-80 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {filteredOperators.length === 0 && (
                        <div className="col-span-2 flex flex-col items-center justify-center py-8 text-center">
                            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                <UserCircleIcon className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-xs font-medium text-slate-500">
                                {typePermutation === "ENVOYER"
                                    ? "Aucun opérateur disponible pour cette période / recherche."
                                    : "Aucun opérateur libre disponible pour le moment."}
                            </p>
                        </div>
                    )}

                    {filteredOperators.map((emp: EmployeeLocal) => {
                        const checked = operatorIds.includes(emp.id);
                        const matricule = emp.matricule ?? "";
                        const isFree = operatorAvailability.get(emp.id) ?? true;
                        const supervisorName = emp.supervisorFullName || emp.supervisor?.fullName;

                        const initials = (emp.fullName ?? "")
                            .split(" ")
                            .slice(0, 2)
                            .map((w: string) => w[0] ?? "")
                            .join("")
                            .toUpperCase();

                        return (
                            <label
                                key={emp.id}
                                className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm transition-all"
                            style={checked
                                ? { borderColor: "var(--accent)", background: "var(--accent-soft)", boxShadow: "0 0 0 1px var(--accent)" }
                                : { borderColor: "var(--border)", background: "var(--surface)" }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleOperator(emp.id)}
                                    className="sr-only"
                                />

                                {/* Avatar initiales */}
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors"
                                    style={checked
                                        ? { background: "var(--accent)", color: "#fff" }
                                        : typePermutation === "ENVOYER"
                                            ? isFree
                                                ? { background: "var(--green-soft)", color: "var(--green)" }
                                                : { background: "var(--red-soft)", color: "var(--red)" }
                                            : { background: "var(--steel-light)", color: "var(--text-2)" }}
                                >
                                    {initials}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <p className="truncate text-sm font-semibold text-slate-900">{emp.fullName}</p>
                                        {checked && <CheckCircleIcon className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />}
                                    </div>

                                    {matricule && (
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                            {matricule}
                                        </p>
                                    )}

                                    {typePermutation === "RECEVOIR" && supervisorName && (
                                        <p className="mt-0.5 text-[10px] text-slate-500">
                                            <span className="text-slate-400">Sup. </span>
                                            <span className="font-medium text-slate-600">{supervisorName}</span>
                                        </p>
                                    )}

                                    {typePermutation === "ENVOYER" && (
                                        <span className={`mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                                            isFree ? "text-green-700" : "text-red-600"
                                        }`}>
                                            {isFree ? (
                                                <><CheckCircleIcon className="h-3 w-3" />Libre</>
                                            ) : (
                                                <><XCircleIcon className="h-3 w-3" />Occupé</>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </label>
                        );
                    })}
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                    {typePermutation === "ENVOYER"
                        ? "Cochez chaque opérateur concerné par cette permutation."
                        : "Sélectionnez les opérateurs libres que vous souhaitez intégrer (uniquement aujourd'hui)."}
                </p>
            </div>

            {/* FOOTER BUTTON */}
            <div className="flex justify-end pt-1">
                <button
                    type="submit"
                    disabled={isPending}
                    className="ds-btn-primary h-11 px-8"
                >
                    {isPending ? "Création..." : typePermutation === "ENVOYER" ? "Envoyer les opérateurs" : "Recevoir les opérateurs"}
                </button>
            </div>
        </form>
    );
}