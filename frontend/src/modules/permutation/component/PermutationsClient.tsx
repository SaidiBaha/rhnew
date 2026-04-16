// src/modules/permutation/component/PermutationsClient.tsx

import Swal from "sweetalert2";
import { useEffect, useMemo, useState } from "react";

import { formatPermutation } from "../utils/formatPermutation";
import { useUpdatePermutationStatus } from "../hooks/useUpdatePermutationStatus";

import type { Permutation } from "../types";
import type { Employee } from "@/modules/employee/hooks/useFetchEmployees";
import type { ProductionLine } from "@/modules/permutation/hooks/useFetchProductionLines";

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
    uiVariant: _uiVariant = "demandes",
}: Props) {
    const { mutateAsync } = useUpdatePermutationStatus();
    const [loadingId, setLoadingId] = useState<number | null>(null);

    const { data: supervisors = [], isLoading: supervisorsLoading } = useFetchSupervisors();

    const [page, setPage] = useState(1);
    const [supervisorFilter, setSupervisorFilter] = useState<number | "">("");
    const [productionLineFilter, setProductionLineFilter] = useState<number | "">("");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [createdAtFrom, setCreatedAtFrom] = useState<string>("");
    const [createdAtTo, setCreatedAtTo] = useState<string>("");
    const [todayOnly, setTodayOnly] = useState(false);
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

    const getOperatorsLabel = (perm: Permutation) => {
        const namesFromBackend = (perm as any).operatorNames as string[] | undefined;
        if (namesFromBackend && namesFromBackend.length > 0) return namesFromBackend.join(", ");

        const opsFromBackend = (perm as any).operators as
            | Array<{ id: number; fullName?: string; matricule?: string | null }>
            | undefined;

        if (opsFromBackend && opsFromBackend.length > 0) {
            const n = opsFromBackend.map((o) => (o.fullName ?? "").trim()).filter(Boolean);
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

    const getOperatorsWithSupervisorsLabel = (perm: Permutation) => {
        const list = (perm as any).operatorsWithSupervisors as OperatorWithSupervisor[] | undefined;
        if (!Array.isArray(list) || list.length === 0) return null;

        const rows = list
            .map((x) => {
                const op =
                    (x.operatorFullName ?? "").trim() ||
                    (x.operatorMatricule ? `#${x.operatorMatricule}` : x.operatorId ? `#${x.operatorId}` : "");
                const sup =
                    (x.supervisorFullName ?? "").trim() ||
                    (x.supervisorMatricule ? `#${x.supervisorMatricule}` : x.supervisorId ? `#${x.supervisorId}` : "—");
                if (!op) return null;
                return `${op} → ${sup}`;
            })
            .filter(Boolean) as string[];

        return rows.length > 0 ? rows : null;
    };

    const getSendersList = (perm: any) => {
        const names = (perm.senderFullNames as string[] | undefined)
            ?.map((x) => (x ?? "").trim())
            .filter(Boolean);
        const mats = (perm.senderMatricules as string[] | undefined)
            ?.map((x) => (x ?? "").trim())
            .filter(Boolean);

        if (names && names.length > 0) return { names, matricules: mats ?? [] };

        const oldName = (perm.senderFullName as string | undefined)?.trim();
        const oldMat = (perm.senderMatricule as string | undefined)?.trim();
        if (oldName) return { names: [oldName], matricules: oldMat ? [oldMat] : [] };

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

    const supervisorOptions = useMemo(() => {
        return (supervisors as any[])
            .map((s) => ({
                id: Number(s.id),
                name: (s.fullName as string) || (s.matricule ? `#${s.matricule}` : `#${s.id}`),
            }))
            .filter((x) => Number.isFinite(x.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [supervisors]);

    const productionLineOptions = useMemo(() => {
        const map = new Map<number, string>();
        data.forEach((p: any) => {
            if (p.productionLineId == null) return;
            const id = Number(p.productionLineId);
            const pl = productionLinesById[id];
            const name = (pl as any)?.name ?? (pl as any)?.label ?? `Ligne #${id}`;
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

            if (createdAtFrom || createdAtTo) {
                const createdDate = p.createdAt ? (p.createdAt as string).slice(0, 10) : "";
                if (!createdDate) return false;
                if (createdAtFrom && createdDate < createdAtFrom) return false;
                if (createdAtTo && createdDate > createdAtTo) return false;
            }

            return true;
        });
    }, [data, supervisorFilter, productionLineFilter, dateFrom, dateTo, createdAtFrom, createdAtTo, todayOnly, showTodayOnlyToggle]);

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

    /* ---- Status pill ---- */
    const statusBadge = (status: string) => {
        if (status === "ACCEPTEE") {
            return <span className="ds-pill ds-pill-green">Acceptée</span>;
        }
        if (status === "REFUSEE") {
            return <span className="ds-pill ds-pill-red">Refusée</span>;
        }
        if (status === "TERMINEE") {
            return <span className="ds-pill ds-pill-muted">Terminée</span>;
        }
        return <span className="ds-pill ds-pill-amber">En attente</span>;
    };

    /* ---- Project badge ---- */
    const projectBadge = (name: string) => {
        const upper = name.toUpperCase();
        if (upper.includes("SKODA") || upper.includes("ŠKODA")) {
            return (
                <span
                    className="font-mono-data inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid #b3ddf0" }}
                >
                    {name}
                </span>
            );
        }
        return (
            <span
                className="font-mono-data inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: "#e8ecf5", color: "var(--navy)", border: "1px solid #c4cede" }}
            >
                {name}
            </span>
        );
    };

    const resetFilters = () => {
        setSupervisorFilter("");
        setProductionLineFilter("");
        setDateFrom("");
        setDateTo("");
        setCreatedAtFrom("");
        setCreatedAtTo("");
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

        const title = action === "accept" ? "Confirmer l'acceptation" : "Confirmer le refus";
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

    return (
        <div className="w-full">
            <div className="ds-card w-full overflow-hidden">

                {/* ===== Top bar ===== */}
                <div
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                    style={{ borderBottom: "1px solid var(--border)" }}
                >
                    <div className="flex flex-col">
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
                            Liste des permutations
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                            Affichage de{" "}
                            <strong style={{ color: "var(--text-2)" }}>{fromItem}</strong> à{" "}
                            <strong style={{ color: "var(--text-2)" }}>{toItem}</strong> sur{" "}
                            <strong style={{ color: "var(--text-2)" }}>{totalItems}</strong> résultats
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {showTodayOnlyToggle && (
                            <button
                                type="button"
                                onClick={() => { setTodayOnly((v) => !v); setPage(1); }}
                                className="rounded-md px-3 py-1.5 text-xs font-semibold border transition-all duration-150"
                                style={
                                    todayOnly
                                        ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "rgba(232,93,38,0.25)" }
                                        : { background: "var(--surface2)", color: "var(--text-2)", borderColor: "var(--border)" }
                                }
                            >
                                En cours (aujourd&apos;hui)
                            </button>
                        )}
                    </div>
                </div>

                {/* ===== Filters ===== */}
                <div
                    className="px-5 py-3"
                    style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}
                >
                    <div className="flex flex-wrap items-center gap-3">
                        <span
                            style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.12em",
                                color: "var(--text-3)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Filtres
                        </span>

                        {/* Superviseur */}
                        <select
                            value={supervisorFilter}
                            onChange={(e) => setSupervisorFilter(e.target.value ? Number(e.target.value) : "")}
                            className="ds-input"
                        >
                            <option value="">
                                {supervisorsLoading ? "Chargement..." : "Tous les superviseurs"}
                            </option>
                            {supervisorOptions.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        {/* Ligne de production */}
                        <select
                            value={productionLineFilter}
                            onChange={(e) => setProductionLineFilter(e.target.value ? Number(e.target.value) : "")}
                            className="ds-input"
                        >
                            <option value="">Toutes les lignes</option>
                            {productionLineOptions.map((pl) => (
                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                            ))}
                        </select>

                        {/* Date début (permutation) */}
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="ds-input font-mono-data"
                            title="Date de permutation — du"
                        />

                        {/* Date fin (permutation) */}
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="ds-input font-mono-data"
                            title="Date de permutation — au"
                        />

                        <span
                            style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.12em",
                                color: "var(--text-3)",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Créé du
                        </span>

                        {/* Date création — du */}
                        <input
                            type="date"
                            value={createdAtFrom}
                            onChange={(e) => { setCreatedAtFrom(e.target.value); setPage(1); }}
                            className="ds-input font-mono-data"
                            title="Date de création — du"
                        />

                        <span style={{ color: "var(--border-mid)" }}>→</span>

                        {/* Date création — au */}
                        <input
                            type="date"
                            value={createdAtTo}
                            onChange={(e) => { setCreatedAtTo(e.target.value); setPage(1); }}
                            className="ds-input font-mono-data"
                            title="Date de création — au"
                        />

                        {/* Reset */}
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150"
                            style={{ background: "transparent", color: "var(--text-3)", border: "1px solid var(--border)" }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)";
                                (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                                (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,93,38,0.30)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                                (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
                                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                            }}
                        >
                            ↺ Réinitialiser
                        </button>
                    </div>
                </div>

                {/* ===== Empty state ===== */}
                {filteredData.length === 0 ? (
                    <div className="p-10 text-center">
                        <div
                            className="mx-auto max-w-xs rounded-lg p-8"
                            style={{ border: "1px dashed var(--border)", background: "var(--surface2)" }}
                        >
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)" }}>
                                Aucune permutation
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
                                Essayez de modifier les filtres ou réinitialiser.
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ===== Desktop table ===== */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="ds-table min-w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="text-left">Émetteur(s)</th>
                                        <th className="text-left">Récepteur</th>
                                        <th className="text-left">Projet</th>
                                        <th className="text-left">Opérateurs</th>
                                        <th className="text-left">Dates</th>
                                        <th className="text-left">Horaires</th>
                                        <th className="text-left">Date de création</th>
                                        <th className="text-left">Statut</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>

                                <tbody style={{ borderTop: "1px solid var(--border)" }}>
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
                                                style={{
                                                    borderBottom: "1px solid var(--border)",
                                                    animationDelay: `${index * 0.04}s`,
                                                }}
                                            >
                                                {/* EMETTEURS */}
                                                <td className="px-5 py-4 align-top">
                                                    <div className="flex flex-col gap-1">
                                                        {senders.names.map((name: string, idx: number) => (
                                                            <div key={`${p.id}-sender-${idx}`} className="leading-5">
                                                                <span style={{ fontWeight: 600, color: "var(--text-1)" }}>
                                                                    {name}
                                                                </span>
                                                                {senders.matricules[idx] && (
                                                                    <span
                                                                        className="ml-2 font-mono-data"
                                                                        style={{ fontSize: "10px", color: "var(--text-3)" }}
                                                                    >
                                                                        #{senders.matricules[idx]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>

                                                {/* RECEPTEUR */}
                                                <td className="px-5 py-4 align-top">
                                                    <div style={{ fontWeight: 600, color: "var(--text-1)" }}>
                                                        {receiverLabel}
                                                    </div>
                                                    {p.receiverMatricule && (
                                                        <div
                                                            className="font-mono-data"
                                                            style={{ fontSize: "10px", color: "var(--text-3)" }}
                                                        >
                                                            MAT. {p.receiverMatricule}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* PROJET */}
                                                <td className="px-5 py-4 align-top">
                                                    {projectBadge(projectName)}
                                                </td>

                                                {/* OPERATEURS */}
                                                <td className="px-5 py-4 align-top" style={{ fontSize: "12px", color: "var(--text-2)" }}>
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
                                                                className="mt-1 text-[11px] font-semibold hover:underline"
                                                                style={{ color: "var(--teal)" }}
                                                            >
                                                                {isExpanded
                                                                    ? "Voir moins"
                                                                    : `+ ${opsLines.length - maxLines} de plus`}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* DATES */}
                                                <td className="px-5 py-4 align-top">
                                                    <span
                                                        className="font-mono-data"
                                                        style={{ fontSize: "12px", color: "var(--text-2)" }}
                                                    >
                                                        {f.dateRange}
                                                    </span>
                                                </td>

                                                {/* HORAIRES */}
                                                <td className="px-5 py-4 align-top">
                                                    <span
                                                        className="font-mono-data"
                                                        style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-1)" }}
                                                    >
                                                        {f.timeRange}
                                                    </span>
                                                </td>

                                                {/* DATE DE CREATION */}
                                                <td className="px-5 py-4 align-top">
                                                    <span
                                                        className="font-mono-data"
                                                        style={{ fontSize: "12px", color: "var(--text-3)" }}
                                                    >
                                                        {p.createdAt
                                                            ? (p.createdAt as string).slice(0, 10)
                                                            : "—"}
                                                    </span>
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
                                                                className="rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                                                                style={{ background: "var(--green)" }}
                                                                onMouseEnter={(e) => !isRowLoading && ((e.currentTarget as HTMLElement).style.background = "#158a5c")}
                                                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--green)")}
                                                            >
                                                                {isRowLoading ? "..." : "Accepter"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isRowLoading}
                                                                onClick={() => handleAction(p, "refuse")}
                                                                className="rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                                                                style={{ background: "var(--red)" }}
                                                                onMouseEnter={(e) => !isRowLoading && ((e.currentTarget as HTMLElement).style.background = "#a82830")}
                                                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--red)")}
                                                            >
                                                                {isRowLoading ? "..." : "Refuser"}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="rounded-md px-2.5 py-1 text-sm font-semibold transition-colors"
                                                            style={{
                                                                background: "var(--surface2)",
                                                                color: "var(--text-3)",
                                                                border: "1px solid var(--border)",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)";
                                                                (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                                                                (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,93,38,0.25)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
                                                                (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
                                                                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                                                            }}
                                                        >
                                                            ···
                                                        </button>
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
                                            className="ds-card rounded-lg p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>Projet</div>
                                                    <div className="mt-1">{projectBadge(projectName)}</div>
                                                </div>
                                                <div>{statusBadge(p.status)}</div>
                                            </div>

                                            <div className="mt-3 space-y-2" style={{ fontSize: "12px" }}>
                                                <div>
                                                    <div style={{ color: "var(--text-3)" }}>Émetteur(s)</div>
                                                    <div className="mt-1 space-y-0.5">
                                                        {senders.names.map((n: string, i: number) => (
                                                            <div key={i} style={{ fontWeight: 600, color: "var(--text-1)" }}>{n}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ color: "var(--text-3)" }}>Récepteur</div>
                                                    <div className="mt-0.5" style={{ fontWeight: 600, color: "var(--text-1)" }}>{receiverLabel}</div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <div style={{ color: "var(--text-3)" }}>Dates</div>
                                                        <div className="mt-0.5 font-mono-data" style={{ color: "var(--text-2)" }}>{f.dateRange}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: "var(--text-3)" }}>Horaires</div>
                                                        <div className="mt-0.5 font-mono-data" style={{ fontWeight: 600, color: "var(--text-1)" }}>{f.timeRange}</div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ color: "var(--text-3)" }}>Opérateurs</div>
                                                    <div className="mt-0.5" style={{ color: "var(--text-2)" }}>
                                                        {pairs ? pairs.slice(0, 3).join(" • ") : getOperatorsLabel(p)}
                                                    </div>
                                                </div>
                                                {canValidate && (
                                                    <div className="mt-2 flex gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isRowLoading}
                                                            onClick={() => handleAction(p, "accept")}
                                                            className="flex-1 rounded-md py-2 text-xs font-semibold text-white transition-colors"
                                                            style={{ background: "var(--green)" }}
                                                        >
                                                            {isRowLoading ? "..." : "Accepter"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isRowLoading}
                                                            onClick={() => handleAction(p, "refuse")}
                                                            className="flex-1 rounded-md py-2 text-xs font-semibold text-white transition-colors"
                                                            style={{ background: "var(--red)" }}
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
                        <div
                            className="flex items-center justify-between gap-3 px-5 py-3"
                            style={{ borderTop: "1px solid var(--border)" }}
                        >
                            <div style={{ fontSize: "12px", color: "var(--text-3)" }}>
                                Page{" "}
                                <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{page}</span>
                                {" "}/ {" "}
                                <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{totalPages}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40"
                                    style={{ background: "var(--surface2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                                >
                                    ‹
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40"
                                    style={{ background: "var(--surface2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
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
