import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";

import {
  useFetchAvailableOperators,
  getRole,
  type OperatorAvailability,
} from "@/modules/employee/hooks/useFetchAvailableOperators";
import { useMarkOperatorsAsFree } from "@/modules/employee/hooks/useMarkOperatorsAsFree";
import { useMarkOperatorsAsBusy } from "@/modules/employee/hooks/useMarkOperatorsAsBusy";
import useAuth from "@/hooks/useAuth";

export default function OperatorsAvailabilityPage() {
  const { auth } = useAuth();
  const role = getRole(auth as any);
  const isOpManager = role === "OPERATIONAL_MANAGER";

  const { data, isLoading, isFetching, error } = useFetchAvailableOperators();

  const { mutateAsync: markFree, isPending: freePending } =
      useMarkOperatorsAsFree();
  const { mutateAsync: markBusy, isPending: busyPending } =
      useMarkOperatorsAsBusy();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<
      "all" | "free" | "busy"
  >("all");

  // ✅ OPERATIONAL_MANAGER => toujours afficher "free" (read-only)
  useEffect(() => {
    if (isOpManager) {
      setAvailabilityFilter("free");
      setSelectedIds([]); // sécurité
    }
  }, [isOpManager]);

  // ✅ stats
  const stats = useMemo(() => {
    const operators = data ?? [];
    const allCount = operators.length;
    const freeCount = operators.filter((op: any) => op.free).length;
    const busyCount = operators.filter((op: any) => !op.free).length;
    return { allCount, freeCount, busyCount };
  }, [data]);

  const toggle = (id: number) => {
    if (isOpManager) return; // ✅ read-only
    setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoading || isFetching) return <Loader />;
  if (error) return <ErrorAlert error="Erreur de chargement" />;

  // ✅ filtrage (search + disponibilité)
  const operators = (data ?? []).filter((op: any) => {
    const matchSearch =
        (op.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (op.matricule ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (op.supervisorFullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (op.supervisorMatricule ?? "").toLowerCase().includes(search.toLowerCase());

    const matchAvailability =
        availabilityFilter === "all"
            ? true
            : availabilityFilter === "free"
                ? op.free
                : !op.free;

    return matchSearch && matchAvailability;
  });

  const submit = async (mode: "free" | "busy") => {
    // ✅ OPERATIONAL_MANAGER => read-only
    if (isOpManager) return;

    if (selectedIds.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Aucun opérateur",
        text: "Veuillez sélectionner au moins un opérateur",
      });
      return;
    }

    try {
      if (mode === "free") await markFree({ employeeIds: selectedIds });
      else await markBusy({ employeeIds: selectedIds });

      await Swal.fire({
        icon: "success",
        title: "Succès",
        text:
            mode === "free"
                ? "Opérateurs marqués comme libres"
                : "Opérateurs marqués comme occupés",
      });

      setSelectedIds([]);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Erreur serveur",
        text: "Impossible de mettre à jour les opérateurs",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Disponibilité des opérateurs</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isOpManager
              ? "Liste des opérateurs disponibles (lecture seule)"
              : "Gérez rapidement l'état des opérateurs"}
          </p>
        </div>
        {isOpManager && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Lecture seule
          </span>
        )}
      </div>

      {/* ── Stat cards (= filtres cliquables) ── */}
      <div className="grid grid-cols-3 gap-4">
        {!isOpManager && (
          <button
            onClick={() => setAvailabilityFilter("all")}
            className={`rounded-2xl border p-4 text-left transition-all ${
              availabilityFilter === "all"
                ? "border-slate-400 bg-slate-800 text-white ring-1 ring-slate-300"
                : "border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md"
            }`}
          >
            <p className={`text-3xl font-bold ${availabilityFilter === "all" ? "text-white" : "text-slate-800"}`}>
              {stats.allCount}
            </p>
            <p className={`mt-1 text-xs font-medium ${availabilityFilter === "all" ? "text-slate-300" : "text-slate-500"}`}>
              Total opérateurs
            </p>
          </button>
        )}

        <button
          onClick={() => !isOpManager && setAvailabilityFilter("free")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            isOpManager ? "cursor-default" : "cursor-pointer"
          } ${
            availabilityFilter === "free"
              ? "border-emerald-400 bg-emerald-600 ring-1 ring-emerald-300"
              : "border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md"
          }`}
        >
          <p className={`text-3xl font-bold ${availabilityFilter === "free" ? "text-white" : "text-emerald-600"}`}>
            {stats.freeCount}
          </p>
          <p className={`mt-1 text-xs font-medium ${availabilityFilter === "free" ? "text-emerald-100" : "text-slate-500"}`}>
            Libres
          </p>
        </button>

        {!isOpManager && (
          <button
            onClick={() => setAvailabilityFilter("busy")}
            className={`rounded-2xl border p-4 text-left transition-all ${
              availabilityFilter === "busy"
                ? "border-red-400 bg-red-600 ring-1 ring-red-300"
                : "border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md"
            }`}
          >
            <p className={`text-3xl font-bold ${availabilityFilter === "busy" ? "text-white" : "text-red-600"}`}>
              {stats.busyCount}
            </p>
            <p className={`mt-1 text-xs font-medium ${availabilityFilter === "busy" ? "text-red-100" : "text-slate-500"}`}>
              Occupés
            </p>
          </button>
        )}
      </div>

      {/* ── Barre de recherche ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Nom, matricule, superviseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm shadow-sm outline-none transition focus:border-[#6b7a12] focus:ring-2 focus:ring-[#6b7a12]/20"
          />
        </div>
        {!isOpManager && selectedIds.length > 0 && (
          <span className="shrink-0 rounded-full bg-[#6b7a12]/10 px-3 py-1.5 text-xs font-semibold text-[#6b7a12]">
            {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Grille opérateurs ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[500px] overflow-y-auto pr-1">
        {operators.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <MagnifyingGlassIcon className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Aucun opérateur trouvé</p>
            <p className="mt-1 text-xs text-slate-400">
              Modifiez votre recherche ou le filtre de disponibilité
            </p>
          </div>
        )}

        {operators.map((op: OperatorAvailability) => {
          const checked = selectedIds.includes(op.id);

          const initials = (op.fullName ?? "")
            .split(" ")
            .slice(0, 2)
            .map((w: string) => w[0] ?? "")
            .join("")
            .toUpperCase();

          return (
            <label
              key={op.id}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-all ${
                isOpManager ? "cursor-default" : "cursor-pointer"
              } ${
                !isOpManager && checked
                  ? "border-[#6b7a12] bg-[#6b7a12]/5 ring-1 ring-[#6b7a12]/20"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md"
              }`}
            >
              {/* ✅ OP_MANAGER: pas de checkbox */}
              {!isOpManager && (
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(op.id)}
                  className="sr-only"
                />
              )}

              {/* Avatar initiales */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors ${
                  !isOpManager && checked
                    ? "bg-[#6b7a12] text-white"
                    : op.free
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{op.fullName}</p>
                  {!isOpManager && checked && (
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-[#6b7a12]" />
                  )}
                </div>

                {op.matricule && (
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {op.matricule}
                  </p>
                )}

                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  <span className="text-slate-400">Sup. </span>
                  <span className="font-medium text-slate-600">{op.supervisorFullName ?? "—"}</span>
                  {op.supervisorMatricule && (
                    <span className="text-slate-400"> ({op.supervisorMatricule})</span>
                  )}
                </p>
              </div>

              {/* Badge statut */}
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                  op.free ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                }`}
              >
                {op.free ? (
                  <><CheckCircleIcon className="h-3 w-3" />Libre</>
                ) : (
                  <><XCircleIcon className="h-3 w-3" />Occupé</>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* ── Barre d'actions sticky ── */}
      {/* ✅ OP_MANAGER: cacher tout le bloc actions */}
      {!isOpManager && (
        <div className="sticky bottom-0 flex items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-5 py-3 shadow-lg backdrop-blur">
          <div>
            {selectedIds.length > 0 ? (
              <span className="text-sm font-semibold text-[#6b7a12]">
                {selectedIds.length} opérateur{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-sm text-slate-400">
                Sélectionnez des opérateurs pour modifier leur statut
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              disabled={freePending}
              onClick={() => submit("free")}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Marquer libre
            </button>

            <button
              disabled={busyPending}
              onClick={() => submit("busy")}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <XCircleIcon className="h-4 w-4" />
              Marquer occupé
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
