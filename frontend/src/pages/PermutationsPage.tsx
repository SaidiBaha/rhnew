import { useMemo, useState } from "react";
import {
    MagnifyingGlassIcon,
    PlusIcon,
} from "@heroicons/react/24/solid";

import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";

import { useFetchPermutations } from "@/modules/permutation/hooks/useFetchPermutations";
import { PermutationsClient } from "@/modules/permutation/component/PermutationsClient";
import { PermutationForm } from "@/modules/permutation/component/PermutationForm";

import { useFetchEmployees } from "@/modules/employee/hooks/useFetchEmployees";
import { useFetchProductionLines } from "@/modules/permutation/hooks/useFetchProductionLines";

import type { Permutation } from "@/modules/permutation/types";
import type { ProductionLine } from "@/modules/permutation/hooks/useFetchProductionLines";

import useAuth from "@/hooks/useAuth";

type FilterMode = "all" | "received" | "sent";
type PermutationMode = "send" | "choose";

function hasRole(auth: any, role: string) {
    const r =
        auth?.user?.role ||
        auth?.role ||
        auth?.user?.authorities?.[0] ||
        auth?.authorities?.[0] ||
        null;

    if (!r) return false;
    const raw = typeof r === "string" ? r : r?.authority;
    if (!raw) return false;

    const clean = String(raw).replace("ROLE_", "");
    return clean === role;
}

/* ---- Stat card component ---- */
function PermStatCard({
    label,
    value,
    icon,
    accentColor,
    active,
    onClick,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    accentColor: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="ds-stat-card text-left w-full"
            style={{
                borderLeft: `4px solid ${accentColor}`,
                outline: active ? `2px solid ${accentColor}` : "none",
                outlineOffset: "-2px",
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--text-3)",
                    }}
                >
                    {label}
                </span>
                <span
                    className="flex h-8 w-8 items-center justify-center rounded-md"
                    style={{ background: `${accentColor}18`, color: accentColor }}
                >
                    {icon}
                </span>
            </div>
            <div
                className="font-mono-data"
                style={{ fontSize: "28px", fontWeight: 600, color: "var(--text-1)", lineHeight: 1 }}
            >
                {value}
            </div>
        </button>
    );
}

export default function PermutationsPage() {
    const { auth } = useAuth();
    const isSupervisor = hasRole(auth, "SUPERVISOR");
    const isOperationalManager = hasRole(auth, "OPERATIONAL_MANAGER");

    const { data, error, isLoading, isFetching } = useFetchPermutations();
    const { data: employees, isLoading: empLoading, isFetching: empFetching } = useFetchEmployees();
    const {
        data: productionLines,
        isLoading: plLoading,
        isFetching: plFetching,
        error: plError,
    } = useFetchProductionLines();

    const [filter, setFilter] = useState<FilterMode>("all");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [permutationMode, _setPermutationMode] = useState<PermutationMode>("send");
    const [search, setSearch] = useState("");

    const rawPermutations: Permutation[] = data ?? [];
    const employeesList = employees ?? [];
    const productionLinesList: ProductionLine[] = productionLines ?? [];

    const employeesById = useMemo(
        () => Object.fromEntries(employeesList.map((e) => [e.id, e])),
        [employeesList]
    );

    const productionLinesById = useMemo(
        () => Object.fromEntries(productionLinesList.map((pl) => [pl.id, pl])),
        [productionLinesList]
    );

    const effectiveFilter: FilterMode = isSupervisor ? filter : "all";

    const receivedCount = useMemo(
        () => rawPermutations.filter((p) => p.asReceiver).length,
        [rawPermutations]
    );
    const sentCount = useMemo(
        () => rawPermutations.filter((p) => p.asSender).length,
        [rawPermutations]
    );

    const roleFiltered = useMemo(() => {
        return rawPermutations.filter((p) => {
            if (effectiveFilter === "received") return !!p.asReceiver;
            if (effectiveFilter === "sent") return !!p.asSender;
            return true;
        });
    }, [rawPermutations, effectiveFilter]);

    const searched = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return roleFiltered;

        return roleFiltered.filter((p) => {
            const sender = employeesById[p.senderId];
            const receiver = p.receiverId ? employeesById[p.receiverId] : null;

            const senderName =
                (p as any).senderFullName ||
                (sender as any)?.fullName ||
                `${(sender as any)?.firstName ?? ""} ${(sender as any)?.lastName ?? ""}`.trim();

            const receiverName =
                (p as any).receiverFullName ||
                (receiver as any)?.fullName ||
                `${(receiver as any)?.firstName ?? ""} ${(receiver as any)?.lastName ?? ""}`.trim();

            const project =
                p.productionLineId != null ? productionLinesById[p.productionLineId] : undefined;
            const projectName = ((project as any)?.name ?? (project as any)?.label ?? "").toLowerCase();

            const opsNames =
                ((p as any).operatorNames as string[] | undefined)?.join(", ").toLowerCase() ?? "";

            return (
                senderName.toLowerCase().includes(q) ||
                receiverName.toLowerCase().includes(q) ||
                projectName.includes(q) ||
                opsNames.includes(q) ||
                String(p.senderMatricule ?? "").toLowerCase().includes(q) ||
                String(p.receiverMatricule ?? "").toLowerCase().includes(q)
            );
        });
    }, [search, roleFiltered, employeesById, productionLinesById]);

    if (isLoading || isFetching || empLoading || empFetching || plLoading || plFetching) {
        return <Loader />;
    }

    if (error || plError) {
        return (
            <ErrorAlert
                error={
                    (error as any)?.message ||
                    (plError as any)?.message ||
                    "Une erreur s'est produite."
                }
            />
        );
    }

    const today = new Date().toISOString().slice(0, 10);
    const totalCount = searched.length;

    return (
        <div className="flex flex-col gap-5">

            {/* ── Header ── */}
            <div
                className="ds-card px-6 py-4"
                style={{ position: "relative", overflow: "hidden", borderBottom: "2px solid var(--border)" }}
            >
                {/* accent filet bottom */}
                <div
                    className="absolute bottom-0 left-0 h-0.5 w-48"
                    style={{ background: "linear-gradient(to right, var(--accent), transparent)" }}
                />
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "4px" }}>
                            Gestion
                            <span className="mx-2" style={{ color: "var(--border-mid)" }}>/</span>
                            <span style={{ color: "var(--text-2)" }}>Permutations</span>
                        </div>
                        <h1 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", lineHeight: 1.2 }}>
                            Permutations
                        </h1>
                        <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                            Gérer et suivre les permutations d'opérateurs
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <div
                            className="font-mono-data rounded-md px-3 py-1.5"
                            style={{
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "var(--text-2)",
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                            }}
                        >
                            📅 {today}
                        </div>

                        {isSupervisor && (
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(true)}
                                className="ds-btn-primary"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Nouvelle permutation
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Stat cards (clickable filters) ── */}
            <div className={`grid gap-4 ${isSupervisor ? "grid-cols-3" : "grid-cols-1 max-w-xs"}`}>
                {/* TOTAL */}
                <PermStatCard
                    label="Total"
                    value={rawPermutations.length}
                    accentColor="var(--navy)"
                    active={effectiveFilter === "all"}
                    onClick={() => setFilter("all")}
                    icon={
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M16 3l4 4-4 4M8 21l-4-4 4-4M20 7H4M4 17h16" />
                        </svg>
                    }
                />

                {/* REÇUES — superviseur only */}
                {isSupervisor && (
                    <PermStatCard
                        label="Reçues"
                        value={receivedCount}
                        accentColor="var(--teal)"
                        active={effectiveFilter === "received"}
                        onClick={() => setFilter("received")}
                        icon={
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M12 5v14M5 12l7 7 7-7" />
                            </svg>
                        }
                    />
                )}

                {/* ENVOYÉES — superviseur only */}
                {isSupervisor && (
                    <PermStatCard
                        label="Envoyées"
                        value={sentCount}
                        accentColor="var(--accent)"
                        active={effectiveFilter === "sent"}
                        onClick={() => setFilter("sent")}
                        icon={
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                        }
                    />
                )}
            </div>

            {/* ── Search bar ── */}
            <div className="relative max-w-sm">
                <MagnifyingGlassIcon
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: "var(--text-3)" }}
                />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, projet, matricule…"
                    className="ds-input h-10 w-full pl-9 pr-4"
                />
            </div>

            {/* ── Résumé de recherche ── */}
            {search.trim() && (
                <p style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{totalCount}</span>{" "}
                    résultat{totalCount !== 1 ? "s" : ""} pour «{" "}
                    <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{search.trim()}</span> »
                </p>
            )}

            {/* ── Table ── */}
            <PermutationsClient
                data={searched}
                employeesById={employeesById}
                productionLinesById={productionLinesById}
                showTodayOnlyToggle={isOperationalManager}
                uiVariant="demandes"
            />

            {/* ── Modal nouvelle permutation ── */}
            {isSupervisor && isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 backdrop-blur-[2px]">
                    <div
                        className="mt-6 w-full max-w-3xl overflow-hidden"
                        style={{
                            background: "var(--surface)",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            boxShadow: "0 20px 60px rgba(26,35,50,0.20)",
                        }}
                    >
                        <div
                            className="flex items-center justify-between px-6 py-4"
                            style={{
                                borderBottom: "1px solid var(--border)",
                                background: "var(--surface2)",
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)" }}>
                                    Nouvelle permutation
                                </h2>
                                <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                                    Remplissez le formulaire ci-dessous
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                                style={{ color: "var(--text-3)" }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = "var(--steel-light)";
                                    (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = "transparent";
                                    (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
                                }}
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="max-h-[85vh] overflow-y-auto px-6 py-6">
                            <PermutationForm
                                onCreated={() => setIsCreateOpen(false)}
                                mode={permutationMode}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
