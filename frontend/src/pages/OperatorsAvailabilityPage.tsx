import { useState } from "react";
import Swal from "sweetalert2";
import {
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";

import { useFetchAvailableOperators } from "@/modules/employee/hooks/useFetchAvailableOperators";
import { useMarkOperatorsAsFree } from "@/modules/employee/hooks/useMarkOperatorsAsFree";
import { useMarkOperatorsAsBusy } from "@/modules/employee/hooks/useMarkOperatorsAsBusy";

export default function OperatorsAvailabilityPage() {
  const { data, isLoading, isFetching, error } =
    useFetchAvailableOperators();

  const { mutateAsync: markFree, isPending: freePending } =
    useMarkOperatorsAsFree();

  const { mutateAsync: markBusy, isPending: busyPending } =
    useMarkOperatorsAsBusy();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<"all" | "free" | "busy">("all");

  const toggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoading || isFetching) return <Loader />;
  if (error) return <ErrorAlert error="Erreur de chargement" />;

  const operators = (data ?? []).filter((op) => {
    const matchSearch =
      op.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (op.matricule ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchAvailability =
      availabilityFilter === "all"
        ? true
        : availabilityFilter === "free"
        ? op.free
        : !op.free;

    return matchSearch && matchAvailability;
  });

  const submit = async (mode: "free" | "busy") => {
    if (selectedIds.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Aucun opérateur",
        text: "Veuillez sélectionner au moins un opérateur",
      });
      return;
    }

    try {
      if (mode === "free") {
        await markFree({ employeeIds: selectedIds });
      } else {
        await markBusy({ employeeIds: selectedIds });
      }

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
          Gérez rapidement l’état des opérateurs
        </p>
      </div>

      {/* Recherche */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Nom ou matricule..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Tous" },
          { key: "free", label: "Libres" },
          { key: "busy", label: "Occupés" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() =>
              setAvailabilityFilter(
                f.key as "all" | "free" | "busy"
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              availabilityFilter === f.key
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {operators.length === 0 && (
          <p className="text-center text-slate-400 py-10">
            Aucun opérateur trouvé
          </p>
        )}

        {operators.map((op) => {
          const checked = selectedIds.includes(op.id);

          return (
            <label
              key={op.id}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 cursor-pointer transition ${
                checked
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(op.id)}
                className="h-4 w-4"
              />

              <div className="flex-1">
                <p className="font-semibold text-slate-800">
                  {op.fullName}
                </p>
                {op.matricule && (
                  <p className="text-xs text-slate-400">
                    Matricule : {op.matricule}
                  </p>
                )}
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
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white pt-4">
        <button
          disabled={freePending}
          onClick={() => submit("free")}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          Marquer libre
        </button>

        <button
          disabled={busyPending}
          onClick={() => submit("busy")}
          className="rounded-xl bg-red-600 px-6 py-3 text-white font-bold hover:bg-red-700 disabled:opacity-50"
        >
          Marquer occupé
        </button>
      </div>
    </div>
  );
}
