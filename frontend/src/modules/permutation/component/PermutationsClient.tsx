// src/modules/permutation/component/PermutationsClient.tsx

import Swal from "sweetalert2";

import { formatPermutation } from "../utils/formatPermutation";
import { useUpdatePermutationStatus } from "../hooks/useUpdatePermutationStatus";

import type { Permutation } from "../types";
import type { Employee } from "@/modules/employee/hooks/useFetchEmployees";
import type { ProductionLine } from "@/modules/permutation/hooks/useFetchProductionLines";
import { useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 7;

type Props = {
    data: Permutation[];
    employeesById: Record<number, Employee>;
    productionLinesById: Record<number, ProductionLine>;

    // ✅ si true => affiche bouton "En cours (aujourd'hui)" (Operational Manager)
    showTodayOnlyToggle?: boolean;

    // ✅ pour forcer le rendu UI style “Demandes”
    uiVariant?: "demandes" | "default";
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

    // ✅ Pagination
    const [page, setPage] = useState(1);

    // ✅ Filtres (frontend)
    const [supervisorFilter, setSupervisorFilter] = useState<number | "">(""); // sender/receiver
    const [productionLineFilter, setProductionLineFilter] = useState<number | "">(
        ""
    );
    const [dateFrom, setDateFrom] = useState<string>(""); // start date filter
    const [dateTo, setDateTo] = useState<string>(""); // end date filter

    // ✅ option "aujourd'hui" (permutation en cours)
    const [todayOnly, setTodayOnly] = useState(false);

    // === HELPERS =============================================================
    const getEmployeeName = (emp?: Employee | null) => {
        if (!emp) return "";
        if ((emp as any).fullName) return (emp as any).fullName;
        const first = (emp as any).firstName ?? "";
        const last = (emp as any).lastName ?? "";
        return `${first} ${last}`.trim();
    };

    // ✅ opérateurs affichés SANS /employees (fallback)
    const getOperatorsLabel = (perm: Permutation) => {
        // 1) si backend renvoie operatorNames
        const namesFromBackend = (perm as any).operatorNames as string[] | undefined;
        if (namesFromBackend && namesFromBackend.length > 0) {
            return namesFromBackend.join(", ");
        }

        // 2) si backend renvoie operators = [{id, fullName}]
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

        // 3) fallback via employeesById (si dispo)
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

    // ✅ superviseurs (sender/receiver présents dans data)
    const supervisorOptions = useMemo(() => {
        const map = new Map<number, string>();

        data.forEach((p) => {
            const sId = p.senderId;
            const rId = p.receiverId;

            const sName =
                p.senderFullName ||
                getEmployeeName(employeesById[sId]) ||
                (p.senderMatricule ? `#${p.senderMatricule}` : `#${sId}`);

            const rName =
                p.receiverFullName ||
                getEmployeeName(employeesById[rId]) ||
                (p.receiverMatricule ? `#${p.receiverMatricule}` : `#${rId}`);

            if (sId != null) map.set(sId, sName);
            if (rId != null) map.set(rId, rName);
        });

        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data, employeesById]);

    // ✅ production lines options
    const productionLineOptions = useMemo(() => {
        const map = new Map<number, string>();

        data.forEach((p) => {
            if (p.productionLineId == null) return;
            const pl = productionLinesById[p.productionLineId];
            const name = (pl as any)?.name ?? (pl as any)?.label ?? `Ligne #${p.productionLineId}`;
            map.set(p.productionLineId, name);
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

            // 🔁 Reset intelligent (on garde le UI propre)
            setDateFrom("");
            setDateTo("");
            setPage(1);
        }
    }, [dateFrom, dateTo]);

    // ✅ Filtrage frontend (rapide)
    const filteredData = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10);

        return data.filter((p) => {
            // todayOnly => permutation en cours aujourd'hui : startDate <= today <= endDate
            if (showTodayOnlyToggle && todayOnly) {
                if (!(p.startDate <= todayStr && p.endDate >= todayStr)) return false;
            }

            // superviseur (sender OU receiver)
            if (supervisorFilter !== "") {
                const supId = Number(supervisorFilter);
                if (p.senderId !== supId && p.receiverId !== supId) return false;
            }

            // production line
            if (productionLineFilter !== "") {
                const plId = Number(productionLineFilter);
                if ((p.productionLineId ?? null) !== plId) return false;
            }

            // date range overlap: [p.startDate, p.endDate] chevauche [dateFrom, dateTo]
            if (dateFrom || dateTo) {
                const from = dateFrom || "0000-01-01";
                const to = dateTo || "9999-12-31";
                const overlaps = p.startDate <= to && p.endDate >= from;
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

    // ✅ Pagination
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

    // ✅ status badges (propre)
    const statusBadge = (status: string) => {
        if (status === "ACCEPTEE") {
            return (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
          ● Acceptée
        </span>
            );
        }
        if (status === "REFUSEE") {
            return (
                <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-800">
          ● Refusée
        </span>
            );
        }
        return (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
        ● En attente
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

        const sender = employeesById[perm.senderId];
        const receiver = employeesById[perm.receiverId];

        const senderName =
            perm.senderFullName ||
            getEmployeeName(sender) ||
            (perm.senderMatricule ? `#${perm.senderMatricule}` : `#${perm.senderId}`);

        const receiverName =
            perm.receiverFullName ||
            getEmployeeName(receiver) ||
            (perm.receiverMatricule ? `#${perm.receiverMatricule}` : `#${perm.receiverId}`);

        const operatorsLabel = getOperatorsLabel(perm);

        const project =
            perm.productionLineId != null ? productionLinesById[perm.productionLineId] : undefined;

        const projectName = (project as any)?.name ?? "—";

        const title = action === "accept" ? "Confirmer l'acceptation" : "Confirmer le refus";
        const confirmText = action === "accept" ? "Oui, accepter" : "Oui, refuser";
        const confirmColor = action === "accept" ? "#10b981" : "#ef4444";

        const html = `
      <div style="text-align:left;font-size:13px">
        <p><strong>Projet :</strong> ${projectName}</p>
        <p><strong>Émetteur :</strong> ${senderName}</p>
        <p><strong>Récepteur :</strong> ${receiverName}</p>
        <p><strong>Période :</strong> ${f.dateRange}</p>
        <p><strong>Horaires :</strong> ${f.timeRange}</p>
        <p><strong>Opérateurs :</strong> ${operatorsLabel}</p>
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
            setLoadingId(perm.id);

            const updated = await mutateAsync({ id: perm.id, action });
            const newStatus = updated?.status;

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
                err?.response?.data?.message || err?.message || "Une erreur est survenue lors de la mise à jour.";

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

    // === EMPTY ===============================================================
    if (data.length === 0) {
        return (
            <div className="w-full rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Aucune permutation pour le moment.
            </div>
        );
    }

    // === UI ==================================================================
    const isDemandesUI = uiVariant === "demandes";

    return (
        <div className="w-full">
            {/* ✅ Table container (flat like “Demandes”) */}
            <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* Top bar: reset + todayOnly */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="text-sm text-slate-500">
                        Affichage de <span className="font-semibold text-slate-700">{fromItem}</span> à{" "}
                        <span className="font-semibold text-slate-700">{toItem}</span> sur{" "}
                        <span className="font-semibold text-slate-700">{totalItems}</span> permutations
                    </div>

                    <div className="flex items-center gap-2">
                        {showTodayOnlyToggle && (
                            <button
                                type="button"
                                onClick={() => {
                                    setTodayOnly((v) => !v);
                                    setPage(1);
                                }}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                                    todayOnly
                                        ? "border-[#6b7a12] bg-[#6b7a12]/10 text-[#6b7a12]"
                                        : "border-slate-200 bg-white text-slate-600"
                                }`}
                            >
                                En cours (aujourd&apos;hui)
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </div>

                {/* Filters row (like your screenshot “Permutations”) */}
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="grid gap-3 md:grid-cols-4">
                        {/* superviseur */}
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                                Superviseur (émetteur ou récepteur)
                            </label>
                            <select
                                value={supervisorFilter}
                                onChange={(e) =>
                                    setSupervisorFilter(e.target.value ? Number(e.target.value) : "")
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#6b7a12]"
                            >
                                <option value="">Tous</option>
                                {supervisorOptions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* production line */}
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
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

                        {/* date from */}
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                                Date début (range)
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#6b7a12]"
                            />
                        </div>

                        {/* date to */}
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
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

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                        <tr
                            className={
                                isDemandesUI
                                    ? "bg-[#6b7a12] text-white text-xs font-semibold"
                                    : "border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500"
                            }
                        >
                            <th className="px-4 py-3 text-left">Émetteur</th>
                            <th className="px-4 py-3 text-left">Récepteur</th>
                            <th className="px-4 py-3 text-left">Projet</th>
                            <th className="px-4 py-3 text-left">Opérateurs</th>
                            <th className="px-4 py-3 text-left">Dates</th>
                            <th className="px-4 py-3 text-left">Horaires</th>
                            <th className="px-4 py-3 text-left">Statut</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                        {paginatedData.map((p) => {
                            const f = formatPermutation(p);

                            const sender = employeesById[p.senderId];
                            const receiver = employeesById[p.receiverId];

                            const senderName =
                                p.senderFullName ||
                                getEmployeeName(sender) ||
                                (p.senderMatricule ? `#${p.senderMatricule}` : `#${p.senderId}`);

                            const receiverName =
                                p.receiverFullName ||
                                getEmployeeName(receiver) ||
                                (p.receiverMatricule ? `#${p.receiverMatricule}` : `#${p.receiverId}`);

                            const operatorsLabel = getOperatorsLabel(p);

                            const project =
                                p.productionLineId != null ? productionLinesById[p.productionLineId] : undefined;
                            const projectName = (project as any)?.name ?? "—";

                            const isPending = p.status === "EN_ATTENTE";
                            const isRowLoading = loadingId === p.id;

                            // ✅ Actions seulement pour receiver en attente
                            const canValidate = isPending && !!p.asReceiver;

                            return (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900">{senderName}</span>
                                            {p.senderMatricule && (
                                                <span className="text-[11px] uppercase text-slate-400">
                            Matricule : {p.senderMatricule}
                          </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900">{receiverName}</span>
                                            {p.receiverMatricule && (
                                                <span className="text-[11px] uppercase text-slate-400">
                            Matricule : {p.receiverMatricule}
                          </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-top text-xs font-semibold text-slate-700">
                                        {projectName}
                                    </td>

                                    <td className="px-4 py-3 align-top text-xs text-slate-700">
                                        <span className="whitespace-normal">{operatorsLabel}</span>
                                    </td>

                                    <td className="px-4 py-3 align-top text-xs text-slate-700">{f.dateRange}</td>
                                    <td className="px-4 py-3 align-top text-xs text-slate-700">{f.timeRange}</td>

                                    <td className="px-4 py-3 align-top">{statusBadge(p.status)}</td>

                                    <td className="px-4 py-3 align-top text-right">
                                        {canValidate ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isRowLoading}
                                                    onClick={() => handleAction(p, "accept")}
                                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                                >
                                                    {isRowLoading ? "..." : "Accepter"}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isRowLoading}
                                                    onClick={() => handleAction(p, "refuse")}
                                                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
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

                {/* Pagination (like “Demandes”: 1 of N) */}
                <div className="flex items-center justify-end gap-3 px-4 py-3">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs disabled:opacity-40"
                    >
                        ‹
                    </button>

                    <div className="text-xs text-slate-600">
                        {page} of {totalPages}
                    </div>

                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs disabled:opacity-40"
                    >
                        ›
                    </button>
                </div>
            </div>
        </div>
    );
}
