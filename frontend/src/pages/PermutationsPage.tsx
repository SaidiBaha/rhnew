import { useMemo, useState } from "react";
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
type PermutationMode = "send" | "choose"; // ✅ Nouveau type

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
    const [permutationMode, setPermutationMode] = useState<PermutationMode>("send"); // ✅ État pour le mode

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
            const receiver = employeesById[p.receiverId];
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
        <div className="w-full">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div>
                        <h1 className="text-4xl font-bold text-[#6b7a12]">
                            Permutations ({totalCount})
                        </h1>
                        <p className="text-sm text-slate-500">Gérer les permutations.</p>

                        <div className="mt-4">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Rechercher"
                                className="w-[520px] max-w-full rounded-xl border border-[#6b7a12]/30 bg-white px-4 py-3 text-sm outline-none focus:border-[#6b7a12]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex justify-end">
                        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setFilter("all")}
                                className={`rounded-full px-3 py-1 ${
                                    effectiveFilter === "all" ? "bg-slate-100 text-slate-900" : "text-slate-500"
                                }`}
                            >
                                Toutes
                            </button>

                            {isSupervisor && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setFilter("received")}
                                        className={`rounded-full px-3 py-1 ${
                                            effectiveFilter === "received"
                                                ? "bg-slate-100 text-slate-900"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        Reçues
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilter("sent")}
                                        className={`rounded-full px-3 py-1 ${
                                            effectiveFilter === "sent" ? "bg-slate-100 text-slate-900" : "text-slate-500"
                                        }`}
                                    >
                                        Envoyées
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {isSupervisor && (
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#6b7a12] px-6 py-3 text-sm font-medium text-white shadow-sm"
                        >
                            <span className="text-lg leading-none">+</span>
                            Ajouter
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6">
                <PermutationsClient
                    data={searched}
                    employeesById={employeesById}
                    productionLinesById={productionLinesById}
                    showTodayOnlyToggle={isOperationalManager}
                    uiVariant="demandes"
                />
            </div>

            {isSupervisor && isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl mt-6 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <h2 className="text-base font-semibold text-slate-800">
                                Nouvelle permutation
                            </h2>

                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* ✅ ZONE VERTE - Filtre de mode */}
                        <div className="bg-gradient-to-r from-[#6b7a12] to-[#8a9a1a] px-6 py-4">
                            <div className="inline-flex rounded-full border border-white/30 bg-white/20 p-1 text-xs backdrop-blur-sm">
                                <button
                                    type="button"
                                    onClick={() => setPermutationMode("send")}
                                    className={`rounded-full px-4 py-2 font-medium transition-all ${
                                        permutationMode === "send"
                                            ? "bg-white text-[#6b7a12] shadow-sm"
                                            : "text-white hover:bg-white/10"
                                    }`}
                                >
                                    Envoyer un employé
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPermutationMode("choose")}
                                    className={`rounded-full px-4 py-2 font-medium transition-all ${
                                        permutationMode === "choose"
                                            ? "bg-white text-[#6b7a12] shadow-sm"
                                            : "text-white hover:bg-white/10"
                                    }`}
                                >
                                    Recevoir un employé
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
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