// src/modules/permutation/component/PermutationsClient.tsx

import Swal from "sweetalert2";
import { useEffect, useMemo, useState } from "react";

import { formatPermutation } from "../utils/formatPermutation";
import { useUpdatePermutationStatus } from "../hooks/useUpdatePermutationStatus";

import type { Permutation } from "../types";
import type { Employee } from "@/modules/employee/hooks/useFetchEmployees";
import type { ProductionLine } from "@/modules/permutation/hooks/useFetchProductionLines";

// ✅ fetch supervisors from backend
import { useFetchSupervisors } from "@/modules/employee/hooks/useFetchSupervisors";

const ITEMS_PER_PAGE = 7;

type Props = {
    data: Permutation[];
    employeesById: Record<number, Employee>;
    productionLinesById: Record<number, ProductionLine>;
    showTodayOnlyToggle?: boolean;
    uiVariant?: "demandes" | "default";
};

type OperatorWithSupervisor = {
    operatorId: number;
    operatorFullName?: string | null;
    operatorMatricule?: string | null;
    supervisorId?: number | null;
    supervisorFullName?: string | null;
    supervisorMatricule?: string | null;
};

export function PermutationsClient({
                                       data,
                                       employeesById,
                                       productionLinesById,
                                       showTodayOnlyToggle = false,
                                       uiVariant = "demandes",
                                   }: Props) {
    const { mutateAsync } = useUpdatePermutationStatus();
    const [loadingId, setLoadingId] = useState<number | null>(null);

    const { data: supervisors = [], isLoading: supervisorsLoading } =
        useFetchSupervisors();

    const [page, setPage] = useState(1);

    const [supervisorFilter, setSupervisorFilter] = useState<number | "">("");
    const [productionLineFilter, setProductionLineFilter] = useState<number | "">(
        ""
    );
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    const [todayOnly, setTodayOnly] = useState(false);

    // ✅ NEW: expand/collapse operators per row
    const [expandedOps, setExpandedOps] = useState<Record<number, boolean>>({});
    const toggleOps = (id: number) =>
        setExpandedOps((m) => ({ ...m, [id]: !m[id] }));

    // === HELPERS =============================================================
    const getEmployeeName = (emp?: Employee | null) => {
        if (!emp) return "";
        if ((emp as any).fullName) return (emp as any).fullName;
        const first = (emp as any).firstName ?? "";
        const last = (emp as any).lastName ?? "";
        return `${first} ${last}`.trim();
    };

    // ✅ Operators fallback label
    const getOperatorsLabel = (perm: Permutation) => {
        const namesFromBackend = (perm as any).operatorNames as string[] | undefined;
        if (namesFromBackend && namesFromBackend.length > 0) {
            return namesFromBackend.join(", ");
        }

        const opsFromBackend = (perm as any).operators as
            | Array<{ id: number; fullName?: string; matricule?: string | null }>
            | undefined;

        if (opsFromBackend && opsFromBackend.length > 0) {
            const n = opsFromBackend
                .map((o) => (o.fullName ?? "").trim())
                .filter(Boolean);
            if (n.length > 0) return n.join(", ");
            return `${opsFromBackend.length} opérateur(s)`;
        }

        const fallbackNames =
            perm.operatorIds
                ?.map((id) => employeesById[id])
                .filter(Boolean)
                .map((emp) => getEmployeeName(emp)) ?? [];

        if (fallbackNames.length > 0) return fallbackNames.join(", ");

        return perm.operatorIds && perm.operatorIds.length > 0
            ? `${perm.operatorIds.length} opérateur(s)`
            : "-";
    };

    // ✅ Operator -> Supervisor rows
    const getOperatorsWithSupervisorsLabel = (perm: Permutation) => {
        const list = (perm as any).operatorsWithSupervisors as
            | OperatorWithSupervisor[]
            | undefined;

        if (!Array.isArray(list) || list.length === 0) return null;

        const rows = list
            .map((x) => {
                const op =
                    (x.operatorFullName ?? "").trim() ||
                    (x.operatorMatricule
                        ? `#${x.operatorMatricule}`
                        : x.operatorId
                            ? `#${x.operatorId}`
                            : "");

                const sup =
                    (x.supervisorFullName ?? "").trim() ||
                    (x.supervisorMatricule
                        ? `#${x.supervisorMatricule}`
                        : x.supervisorId
                            ? `#${x.supervisorId}`
                            : "—");

                if (!op) return null;
                return `${op} → ${sup}`;
            })
            .filter(Boolean) as string[];

        return rows.length > 0 ? rows : null;
    };

    // ✅ Senders as LIST
    const getSendersList = (perm: any) => {
        const names = (perm.senderFullNames as string[] | undefined)
            ?.map((x) => (x ?? "").trim())
            .filter(Boolean);

        const mats = (perm.senderMatricules as string[] | undefined)
            ?.map((x) => (x ?? "").trim())
            .filter(Boolean);

        if (names && names.length > 0) {
            return { names, matricules: mats ?? [] };
        }

        // old format
        const oldName = (perm.senderFullName as string | undefined)?.trim();
        const oldMat = (perm.senderMatricule as string | undefined)?.trim();
        if (oldName)
            return { names: [oldName], matricules: oldMat ? [oldMat] : [] };

        // ids fallback
        const ids = perm.senderIds as number[] | undefined;
        if (Array.isArray(ids) && ids.length > 0) {
            const resolved = ids
                .map((id) => employeesById[id])
                .filter(Boolean)
                .map((e) => getEmployeeName(e))
                .filter(Boolean);

            return {
                names: resolved.length > 0 ? resolved : ids.map((id) => `#${id}`),
                matricules: [],
            };
        }

        return { names: ["-"], matricules: [] };
    };

    // ✅ receiver label fallback
    const getReceiverLabel = (perm: any) => {
        const name = (perm.receiverFullName as string | undefined)?.trim();
        if (name) return name;

        const id = perm.receiverId as number | undefined;
        if (typeof id === "number") {
            const e = employeesById[id];
            const n = getEmployeeName(e);
            return n || `#${id}`;
        }
        return "-";
    };

    // ✅ supervisors options from API
    const supervisorOptions = useMemo(() => {
        return (supervisors as any[])
            .map((s) => ({
                id: Number(s.id),
                name:
                    (s.fullName as string) ||
                    (s.matricule ? `#${s.matricule}` : `#${s.id}`),
            }))
            .filter((x) => Number.isFinite(x.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [supervisors]);

    // ✅ production lines options
    const productionLineOptions = useMemo(() => {
        const map = new Map<number, string>();

        data.forEach((p: any) => {
            if (p.productionLineId == null) return;
            const id = Number(p.productionLineId);
            const pl = productionLinesById[id];
            const name =
                (pl as any)?.name ?? (pl as any)?.label ?? `Ligne #${id}`;
            map.set(id, name);
        });

        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data, productionLinesById]);

    useEffect(() => {
        if (dateFrom && dateTo && dateFrom > dateTo) {
            Swal.fire({
                icon: "warning",
                title: "Intervalle de dates invalide",
                text: "La date de début ne peut pas être postérieure à la date de fin.",
                confirmButtonColor: "#ef4444",
            });
            setDateFrom("");
            setDateTo("");
            setPage(1);
        }
    }, [dateFrom, dateTo]);

    // ✅ filtering
    const filteredData = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10);

        return data.filter((p: any) => {
            const startDate = p.startDate as string;
            const endDate = p.endDate as string;

            if (showTodayOnlyToggle && todayOnly) {
                if (!(startDate <= todayStr && endDate >= todayStr)) return false;
            }

            if (supervisorFilter !== "") {
                const supId = Number(supervisorFilter);

                const receiverId = Number(p.receiverId ?? p.receiver?.id);
                const senderIds = p.senderIds as number[] | undefined;
                const oldSenderId = p.senderId as number | undefined;

                const senderMatch =
                    (Array.isArray(senderIds) && senderIds.includes(supId)) ||
                    (typeof oldSenderId === "number" && oldSenderId === supId);

                const receiverMatch = Number.isFinite(receiverId) && receiverId === supId;

                if (!senderMatch && !receiverMatch) return false;
            }

            if (productionLineFilter !== "") {
                const plId = Number(productionLineFilter);
                const pid = Number(p.productionLineId ?? -1);
                if (pid !== plId) return false;
            }

            if (dateFrom || dateTo) {
                const from = dateFrom || "0000-01-01";
                const to = dateTo || "9999-12-31";
                const overlaps = startDate <= to && endDate >= from;
                if (!overlaps) return false;
            }

            return true;
        });
    }, [
        data,
        supervisorFilter,
        productionLineFilter,
        dateFrom,
        dateTo,
        todayOnly,
        showTodayOnlyToggle,
    ]);

    // ✅ pagination
    const totalItems = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
        if (page < 1) setPage(1);
    }, [page, totalPages]);

    const paginatedData = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, page]);

    const fromItem = totalItems === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
    const toItem = Math.min(page * ITEMS_PER_PAGE, totalItems);

    const statusBadge = (status: string) => {
        if (status === "ACCEPTEE") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
          <span className="text-[10px]">●</span> Acceptée
        </span>
            );
        }
        if (status === "REFUSEE") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-800">
          <span className="text-[10px]">●</span> Refusée
        </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
        <span className="text-[10px]">●</span> En attente
      </span>
        );
    };

    const resetFilters = () => {
        setSupervisorFilter("");
        setProductionLineFilter("");
        setDateFrom("");
        setDateTo("");
        if (showTodayOnlyToggle) setTodayOnly(false);
        setPage(1);
    };

    const handleAction = async (perm: Permutation, action: "accept" | "refuse") => {
        const f = formatPermutation(perm);

        const senders = getSendersList(perm as any);
        const receiverLabel = getReceiverLabel(perm as any);

        const pairs = getOperatorsWithSupervisorsLabel(perm);
        const operatorsHtml = pairs ? pairs.join("<br/>") : getOperatorsLabel(perm);

        const project =
            (perm as any).productionLineId != null
                ? productionLinesById[Number((perm as any).productionLineId)]
                : undefined;

        const projectName = (project as any)?.name ?? "—";

        const title =
            action === "accept" ? "Confirmer l'acceptation" : "Confirmer le refus";
        const confirmText = action === "accept" ? "Oui, accepter" : "Oui, refuser";
        const confirmColor = action === "accept" ? "#10b981" : "#ef4444";

        const sendersHtml = senders.names
            .map((n: string, i: number) => {
                const m = senders.matricules[i];
                return m
                    ? `${n} <span style="color:#94a3b8;font-size:11px">(Matricule: ${m})</span>`
                    : n;
            })
            .join("<br/>");

        const html = `
      <div style="text-align:left;font-size:13px">
        <p><strong>Projet :</strong> ${projectName}</p>
        <p><strong>Émetteur(s) :</strong><br/> ${sendersHtml}</p>
        <p><strong>Récepteur :</strong> ${receiverLabel}</p>
        <p><strong>Période :</strong> ${f.dateRange}</p>
        <p><strong>Horaires :</strong> ${f.timeRange}</p>
        <p><strong>Opérateurs :</strong><br/> ${operatorsHtml}</p>
      </div>
    `;

        const result = await Swal.fire({
            icon: action === "accept" ? "question" : "warning",
            title,
            html,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: "Annuler",
            confirmButtonColor: confirmColor,
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;

        try {
            setLoadingId((perm as any).id);

            const updated = await mutateAsync({ id: (perm as any).id, action });
            const newStatus = (updated as any)?.status;

            const autoMsg =
                (updated as any)?.autoRefusedMessage ||
                "Un ou plusieurs opérateurs ne sont plus disponibles sur cette période. La permutation a été refusée.";

            if (action === "accept" && newStatus === "REFUSEE") {
                await Swal.fire({
                    icon: "warning",
                    title: "Permutation refusée automatiquement",
                    text: autoMsg,
                    confirmButtonColor: "#ef4444",
                });
                return;
            }

            await Swal.fire({
                icon: "success",
                title: newStatus === "ACCEPTEE" ? "Permutation acceptée" : "Permutation refusée",
                text: "Le statut de la permutation a été mis à jour.",
                confirmButtonColor: "#10b981",
            });
        } catch (err: any) {
            const backendMessage =
                err?.response?.data?.message ||
                err?.message ||
                "Une erreur est survenue lors de la mise à jour.";

            await Swal.fire({
                icon: "error",
                title: "Erreur serveur",
                text: backendMessage,
                confirmButtonColor: "#ef4444",
            });
        } finally {
            setLoadingId(null);
        }
    };

    const isDemandesUI = uiVariant === "demandes";

    return (
        <div className="w-full">
            <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* ===== Top bar ===== */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex flex-col">
                        <div className="text-sm font-semibold text-slate-900">
                            Permutations
                        </div>
                        <div className="text-xs text-slate-500">
                            Affichage de{" "}
                            <span className="font-semibold text-slate-700">{fromItem}</span> à{" "}
                            <span className="font-semibold text-slate-700">{toItem}</span> sur{" "}
                            <span className="font-semibold text-slate-700">{totalItems}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {showTodayOnlyToggle && (
                            <button
                                type="button"
                                onClick={() => {
                                    setTodayOnly((v) => !v);
                                    setPage(1);
                                }}
                                className={`rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition ${
                                    todayOnly
                                        ? "bg-[#6b7a12]/10 text-[#6b7a12] ring-[#6b7a12]/30"
                                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                En cours (aujourd&apos;hui)
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </div>

                {/* ===== Filters ===== */}
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <label className="mb-2 block text-[11px] font-semibold text-slate-600">
                                Superviseur (émetteur(s) ou récepteur)
                            </label>
                            <select
                                value={supervisorFilter}
                                onChange={(e) =>
                                    setSupervisorFilter(e.target.value ? Number(e.target.value) : "")
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#6b7a12]"
                            >
                                <option value="">
                                    {supervisorsLoading ? "Chargement..." : "Tous"}
                                </option>
                                {supervisorOptions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <label className="mb-2 block text-[11px] font-semibold text-slate-600">
                                Ligne de production
                            </label>
                            <select
                                value={productionLineFilter}
                                onChange={(e) =>
                                    setProductionLineFilter(e.target.value ? Number(e.target.value) : "")
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#6b7a12]"
                            >
                                <option value="">Toutes</option>
                                {productionLineOptions.map((pl) => (
                                    <option key={pl.id} value={pl.id}>
                                        {pl.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <label className="mb-2 block text-[11px] font-semibold text-slate-600">
                                Date début (range)
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#6b7a12]"
                            />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <label className="mb-2 block text-[11px] font-semibold text-slate-600">
                                Date fin (range)
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#6b7a12]"
                            />
                        </div>
                    </div>
                </div>

                {/* ===== Empty state ===== */}
                {filteredData.length === 0 ? (
                    <div className="w-full p-10 text-center">
                        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8">
                            <div className="text-sm font-semibold text-slate-900">
                                Aucune permutation
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                Essayez de modifier les filtres ou réinitialiser.
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ===== Desktop table ===== */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="min-w-full text-sm">
                                <thead className="sticky top-0 z-10">
                                <tr
                                    className={
                                        isDemandesUI
                                            ? "bg-[#6b7a12] text-white text-xs font-semibold"
                                            : "border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500"
                                    }
                                >
                                    <th className="px-5 py-3 text-left">Émetteur(s)</th>
                                    <th className="px-5 py-3 text-left">Récepteur</th>
                                    <th className="px-5 py-3 text-left">Projet</th>
                                    <th className="px-5 py-3 text-left">Opérateurs</th>
                                    <th className="px-5 py-3 text-left">Dates</th>
                                    <th className="px-5 py-3 text-left">Horaires</th>
                                    <th className="px-5 py-3 text-left">Statut</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                {paginatedData.map((p: any, index) => {
                                    const f = formatPermutation(p);

                                    const senders = getSendersList(p);
                                    const receiverLabel = getReceiverLabel(p);

                                    const pairs = getOperatorsWithSupervisorsLabel(p);

                                    const project =
                                        p.productionLineId != null
                                            ? productionLinesById[Number(p.productionLineId)]
                                            : undefined;
                                    const projectName = (project as any)?.name ?? "—";

                                    const isPending = p.status === "EN_ATTENTE";
                                    const isRowLoading = loadingId === p.id;
                                    const canValidate = isPending && !!p.asReceiver;

                                    const opsLines = pairs ?? [getOperatorsLabel(p)];
                                    const isExpanded = !!expandedOps[p.id];
                                    const maxLines = 3;
                                    const showToggle = opsLines.length > maxLines;

                                    return (
                                        <tr
                                            key={p.id}
                                            className={`transition hover:bg-slate-50 ${
                                                index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                            }`}
                                        >
                                            {/* EMETTEURS */}
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex flex-col gap-1">
                                                    {senders.names.map((name: string, idx: number) => (
                                                        <div key={`${p.id}-sender-${idx}`} className="leading-5">
                                <span className="font-semibold text-slate-900">
                                  {name}
                                </span>
                                                            {senders.matricules[idx] && (
                                                                <span className="ml-2 text-[11px] uppercase text-slate-400">
                                    (Matricule: {senders.matricules[idx]})
                                  </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* RECEPTEUR */}
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">
                              {receiverLabel}
                            </span>
                                                    {p.receiverMatricule && (
                                                        <span className="text-[11px] uppercase text-slate-400">
                                Matricule : {p.receiverMatricule}
                              </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* PROJET */}
                                            <td className="px-5 py-4 align-top">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {projectName}
                          </span>
                                            </td>

                                            {/* OPERATEURS */}
                                            <td className="px-5 py-4 align-top text-xs text-slate-700">
                                                <div className="space-y-1">
                                                    {(isExpanded ? opsLines : opsLines.slice(0, maxLines)).map(
                                                        (line: string, idx: number) => (
                                                            <div key={idx} className="whitespace-normal leading-5">
                                                                {line}
                                                            </div>
                                                        )
                                                    )}

                                                    {showToggle && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleOps(p.id)}
                                                            className="mt-1 text-[11px] font-semibold text-[#6b7a12] hover:underline"
                                                        >
                                                            {isExpanded
                                                                ? "Voir moins"
                                                                : `Voir plus (+${opsLines.length - maxLines})`}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* DATES */}
                                            <td className="px-5 py-4 align-top text-xs text-slate-700">
                                                {f.dateRange}
                                            </td>

                                            {/* HORAIRES */}
                                            <td className="px-5 py-4 align-top text-xs text-slate-700">
                                                {f.timeRange}
                                            </td>

                                            {/* STATUT */}
                                            <td className="px-5 py-4 align-top">
                                                {statusBadge(p.status)}
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="px-5 py-4 align-top text-right">
                                                {canValidate ? (
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isRowLoading}
                                                            onClick={() => handleAction(p, "accept")}
                                                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                                                        >
                                                            {isRowLoading ? "..." : "Accepter"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isRowLoading}
                                                            onClick={() => handleAction(p, "refuse")}
                                                            className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                                                        >
                                                            {isRowLoading ? "..." : "Refuser"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>

                        {/* ===== Mobile cards ===== */}
                        <div className="block md:hidden">
                            <div className="space-y-3 p-4">
                                {paginatedData.map((p: any) => {
                                    const f = formatPermutation(p);
                                    const senders = getSendersList(p);
                                    const receiverLabel = getReceiverLabel(p);
                                    const pairs = getOperatorsWithSupervisorsLabel(p);

                                    const project =
                                        p.productionLineId != null
                                            ? productionLinesById[Number(p.productionLineId)]
                                            : undefined;
                                    const projectName = (project as any)?.name ?? "—";

                                    const isPending = p.status === "EN_ATTENTE";
                                    const isRowLoading = loadingId === p.id;
                                    const canValidate = isPending && !!p.asReceiver;

                                    return (
                                        <div
                                            key={p.id}
                                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-xs text-slate-500">Projet</div>
                                                    <div className="mt-1 inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                                        {projectName}
                                                    </div>
                                                </div>
                                                <div>{statusBadge(p.status)}</div>
                                            </div>

                                            <div className="mt-3 space-y-2 text-xs">
                                                <div>
                                                    <div className="text-slate-500">Émetteur(s)</div>
                                                    <div className="mt-1 space-y-1">
                                                        {senders.names.map((n: string, i: number) => (
                                                            <div key={i} className="font-semibold text-slate-900">
                                                                {n}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-slate-500">Récepteur</div>
                                                    <div className="mt-1 font-semibold text-slate-900">
                                                        {receiverLabel}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <div className="text-slate-500">Dates</div>
                                                        <div className="mt-1 text-slate-700">{f.dateRange}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500">Horaires</div>
                                                        <div className="mt-1 text-slate-700">{f.timeRange}</div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-slate-500">Opérateurs</div>
                                                    <div className="mt-1 text-slate-700">
                                                        {pairs ? pairs.slice(0, 3).join(" • ") : getOperatorsLabel(p)}
                                                    </div>
                                                </div>

                                                {canValidate && (
                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isRowLoading}
                                                            onClick={() => handleAction(p, "accept")}
                                                            className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                                                        >
                                                            {isRowLoading ? "..." : "Accepter"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isRowLoading}
                                                            onClick={() => handleAction(p, "refuse")}
                                                            className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                                                        >
                                                            {isRowLoading ? "..." : "Refuser"}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ===== Pagination ===== */}
                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <div className="text-xs text-slate-500">
                                Page <span className="font-semibold text-slate-700">{page}</span> /{" "}
                                <span className="font-semibold text-slate-700">{totalPages}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                                >
                                    ‹
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
