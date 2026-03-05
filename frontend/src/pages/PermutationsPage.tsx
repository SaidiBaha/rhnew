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

    // ── Compteurs pour les badges des filtres ──
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

    const totalCount = searched.length;

    return (
        <div className="flex flex-col gap-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Permutations</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Gérer et suivre les permutations d'opérateurs
                    </p>
                </div>

                {isSupervisor && (
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#6b7a12] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a6610]"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Nouvelle permutation
                    </button>
                )}
            </div>

            {/* ── Toolbar : recherche + filtres ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative max-w-sm flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Nom, projet, matricule…"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm shadow-sm outline-none transition focus:border-[#6b7a12] focus:ring-2 focus:ring-[#6b7a12]/20"
                    />
                </div>

                {/* Filtres segmentés avec compteurs */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
                    <button
                        type="button"
                        onClick={() => setFilter("all")}
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-medium transition-all ${
                            effectiveFilter === "all"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        Toutes
                        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold ${
                            effectiveFilter === "all"
                                ? "bg-[#6b7a12]/10 text-[#6b7a12]"
                                : "bg-slate-300 text-slate-600"
                        }`}>
                            {rawPermutations.length}
                        </span>
                    </button>

                    {isSupervisor && (
                        <>
                            <button
                                type="button"
                                onClick={() => setFilter("received")}
                                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-medium transition-all ${
                                    effectiveFilter === "received"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                Reçues
                                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold ${
                                    effectiveFilter === "received"
                                        ? "bg-[#6b7a12]/10 text-[#6b7a12]"
                                        : "bg-slate-300 text-slate-600"
                                }`}>
                                    {receivedCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFilter("sent")}
                                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-medium transition-all ${
                                    effectiveFilter === "sent"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                Envoyées
                                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold ${
                                    effectiveFilter === "sent"
                                        ? "bg-[#6b7a12]/10 text-[#6b7a12]"
                                        : "bg-slate-300 text-slate-600"
                                }`}>
                                    {sentCount}
                                </span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Résumé de recherche ── */}
            {search.trim() && (
                <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{totalCount}</span>{" "}
                    résultat{totalCount !== 1 ? "s" : ""} pour «{" "}
                    <span className="font-medium text-slate-600">{search.trim()}</span> »
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
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
                    <div className="mt-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-[#687818]/5 px-6 py-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">
                                    Nouvelle permutation
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Remplissez le formulaire ci-dessous
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200"
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
