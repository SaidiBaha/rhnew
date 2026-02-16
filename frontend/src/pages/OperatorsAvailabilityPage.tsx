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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Disponibilité des opérateurs
          </h1>

          <p className="text-slate-500">
            {isOpManager
                ? "Liste des opérateurs disponibles (lecture seule)"
                : "Gérez rapidement l'état des opérateurs"}
          </p>
        </div>

        {/* Recherche */}
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
              type="text"
              placeholder="Nom / matricule / superviseur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filtres avec nombres */}
        <div className="flex gap-2">
          {/* ✅ OP_MANAGER: cacher "Tous" et "Occupés" */}
          {!isOpManager && (
              <button
                  onClick={() => setAvailabilityFilter("all")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                      availabilityFilter === "all"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                Tous
                <span
                    className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                        availabilityFilter === "all"
                            ? "bg-white/20"
                            : "bg-slate-300 text-slate-700"
                    }`}
                >
              {stats.allCount}
            </span>
              </button>
          )}

          <button
              onClick={() => setAvailabilityFilter("free")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                  availabilityFilter === "free"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            Libres
            <span
                className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                    availabilityFilter === "free"
                        ? "bg-white/20"
                        : "bg-emerald-100 text-emerald-700"
                }`}
            >
            {stats.freeCount}
          </span>
          </button>

          {!isOpManager && (
              <button
                  onClick={() => setAvailabilityFilter("busy")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                      availabilityFilter === "busy"
                          ? "bg-red-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                Occupés
                <span
                    className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                        availabilityFilter === "busy"
                            ? "bg-white/20"
                            : "bg-red-100 text-red-600"
                    }`}
                >
              {stats.busyCount}
            </span>
              </button>
          )}
        </div>

        {/* Liste */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {operators.length === 0 && (
              <p className="text-center text-slate-400 py-10">
                Aucun opérateur trouvé
              </p>
          )}

          {operators.map((op: any) => {
            const checked = selectedIds.includes(op.id);

            return (
                <label
                    key={op.id}
                    className={`flex items-center gap-4 rounded-2xl border px-5 py-4 cursor-pointer transition ${
                        !isOpManager && checked
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                >
                  {/* ✅ OP_MANAGER: pas de checkbox */}
                  {!isOpManager && (
                      <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(op.id)}
                          className="h-4 w-4"
                      />
                  )}

                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{op.fullName}</p>

                    {/* Matricule opérateur */}
                    {op.matricule && (
                        <p className="text-xs text-slate-400">
                          Matricule : {op.matricule}
                        </p>
                    )}

                    {/* ✅ Superviseur */}
                    <p className="text-xs text-slate-500 mt-1">
                      Superviseur :{" "}
                      <span className="font-semibold text-slate-700">
                    {op.supervisorFullName ?? "—"}
                  </span>
                      {op.supervisorMatricule ? (
                          <span className="text-slate-400">
                      {" "}
                            ({op.supervisorMatricule})
                    </span>
                      ) : null}
                    </p>
                  </div>

                  {/* Badge statut */}
                  <span
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                          op.free
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-600"
                      }`}
                  >
                {op.free ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4" />
                      Libre
                    </>
                ) : (
                    <>
                      <XCircleIcon className="h-4 w-4" />
                      Occupé
                    </>
                )}
              </span>
                </label>
            );
          })}
        </div>

        {/* Actions */}
        {/* ✅ OP_MANAGER: cacher tout le bloc actions */}
        {!isOpManager && (
            <div className="flex justify-end gap-3 sticky bottom-0 bg-white pt-4">
              <div className="mr-auto flex items-center gap-2">
                {selectedIds.length > 0 && (
                    <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                {selectedIds.length} opérateur(s) sélectionné(s)
              </span>
                )}
              </div>

              <button
                  disabled={freePending}
                  onClick={() => submit("free")}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Marquer libre
              </button>

              <button
                  disabled={busyPending}
                  onClick={() => submit("busy")}
                  className="rounded-xl bg-red-600 px-6 py-3 text-white font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <XCircleIcon className="h-5 w-5" />
                Marquer occupé
              </button>
            </div>
        )}
      </div>
  );
}
