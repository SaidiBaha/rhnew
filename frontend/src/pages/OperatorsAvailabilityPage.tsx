import { useState } from "react";
import Swal from "sweetalert2";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

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

  const toggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoading || isFetching) return <Loader />;
  if (error) return <ErrorAlert error="Erreur de chargement" />;

  const operators = data ?? [];

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
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-800">
        Disponibilité des opérateurs
      </h1>

      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {operators.map((op) => {
          const checked = selectedIds.includes(op.id);

          return (
            <label
              key={op.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${
                checked
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(op.id)}
                className="h-4 w-4"
              />

              <div className="flex-1">
                <p className="font-semibold">{op.fullName}</p>
                {op.matricule && (
                  <p className="text-xs text-slate-400">
                    Matricule : {op.matricule}
                  </p>
                )}
              </div>

              {op.free ? (
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
            </label>
          );
        })}
      </div>

      <div className="flex justify-end gap-3">
        <button
          disabled={freePending}
          onClick={() => submit("free")}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-bold"
        >
          Marquer libre
        </button>

        <button
          disabled={busyPending}
          onClick={() => submit("busy")}
          className="rounded-xl bg-red-600 px-6 py-3 text-white font-bold"
        >
          Marquer occupé
        </button>
      </div>
    </div>
  );
}
