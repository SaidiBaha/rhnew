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

  const { mutateAsync: markFree, isPending: freePending } = useMarkOperatorsAsFree();
  const { mutateAsync: markBusy, isPending: busyPending } = useMarkOperatorsAsBusy();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "free" | "busy">("all");

  // ✅ OPERATIONAL_MANAGER => toujours afficher "free" (read-only)
  useEffect(() => {
    if (isOpManager) {
      setAvailabilityFilter("free");
      setSelectedIds([]);
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
    if (isOpManager) return;
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
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div
        className="ds-card px-6 py-4"
        style={{ position: "relative", overflow: "hidden", borderBottom: "2px solid var(--border)" }}
      >
        <div
          className="absolute bottom-0 left-0 h-0.5 w-48"
          style={{ background: "linear-gradient(to right, var(--accent), transparent)" }}
        />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "4px" }}>
              Gestion
              <span className="mx-2" style={{ color: "var(--border-mid)" }}>/</span>
              <span style={{ color: "var(--text-2)" }}>Opérateurs Disponibles</span>
            </div>
            <h1 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", lineHeight: 1.2 }}>
              Disponibilité des opérateurs
            </h1>
            <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
              {isOpManager
                ? "Liste des opérateurs disponibles (lecture seule)"
                : "Gérez rapidement l'état des opérateurs"}
            </p>
          </div>
          {isOpManager && (
            <span
              className="rounded-md px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--amber-soft)", color: "var(--amber)", border: "1px solid rgba(217,119,6,0.25)" }}
            >
              Lecture seule
            </span>
          )}
        </div>
      </div>

      {/* ── Stat cards (= filtres cliquables) ── */}
      <div className={`grid gap-4 ${isOpManager ? "grid-cols-1 max-w-xs" : "grid-cols-3"}`}>
        {/* Total — superviseur only */}
        {!isOpManager && (
          <button
            onClick={() => setAvailabilityFilter("all")}
            className="ds-stat-card text-left"
            style={{ borderLeft: `4px solid var(--navy)`, outline: availabilityFilter === "all" ? "2px solid var(--navy)" : "none", outlineOffset: "-2px" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
                Total opérateurs
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ background: "rgba(26,35,50,0.08)", color: "var(--navy)" }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </span>
            </div>
            <div className="font-mono-data" style={{ fontSize: "28px", fontWeight: 600, color: "var(--text-1)", lineHeight: 1 }}>
              {stats.allCount}
            </div>
          </button>
        )}

        {/* Libres */}
        <button
          onClick={() => !isOpManager && setAvailabilityFilter("free")}
          className="ds-stat-card text-left"
          style={{
            borderLeft: "4px solid var(--green)",
            outline: availabilityFilter === "free" ? "2px solid var(--green)" : "none",
            outlineOffset: "-2px",
            cursor: isOpManager ? "default" : "pointer",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
              Libres
            </span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: "var(--green-soft)", color: "var(--green)" }}
            >
              <CheckCircleIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="font-mono-data" style={{ fontSize: "28px", fontWeight: 600, color: "var(--green)", lineHeight: 1 }}>
            {stats.freeCount}
          </div>
        </button>

        {/* Occupés — superviseur only */}
        {!isOpManager && (
          <button
            onClick={() => setAvailabilityFilter("busy")}
            className="ds-stat-card text-left"
            style={{ borderLeft: "4px solid var(--red)", outline: availabilityFilter === "busy" ? "2px solid var(--red)" : "none", outlineOffset: "-2px" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
                Occupés
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ background: "var(--red-soft)", color: "var(--red)" }}
              >
                <XCircleIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="font-mono-data" style={{ fontSize: "28px", fontWeight: 600, color: "var(--red)", lineHeight: 1 }}>
              {stats.busyCount}
            </div>
          </button>
        )}
      </div>

      {/* ── Barre de recherche ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--text-3)" }}
          />
          <input
            type="text"
            placeholder="Nom, matricule, superviseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ds-input h-10 w-full pl-9 pr-4"
          />
        </div>
        {!isOpManager && selectedIds.length > 0 && (
          <span
            className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(232,93,38,0.25)" }}
          >
            {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Grille opérateurs ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[500px] overflow-y-auto pr-1">
        {operators.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
            <div
              className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg"
              style={{ background: "var(--steel-light)" }}
            >
              <MagnifyingGlassIcon className="h-7 w-7" style={{ color: "var(--text-3)" }} />
            </div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)" }}>Aucun opérateur trouvé</p>
            <p className="mt-1" style={{ fontSize: "12px", color: "var(--text-3)" }}>
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

          const cardStyle = !isOpManager && checked
            ? { background: "var(--accent-soft)", border: "1px solid rgba(232,93,38,0.30)", boxShadow: "0 0 0 2px rgba(232,93,38,0.10)" }
            : { background: "var(--surface)", border: "1px solid var(--border)" };

          const avatarStyle = !isOpManager && checked
            ? { background: "var(--accent)", color: "#fff" }
            : op.free
            ? { background: "var(--green-soft)", color: "var(--green)" }
            : { background: "var(--red-soft)", color: "var(--red)" };

          return (
            <label
              key={op.id}
              className="flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-150"
              style={{
                ...cardStyle,
                cursor: isOpManager ? "default" : "pointer",
                boxShadow: "0 1px 4px rgba(26,35,50,0.06)",
              }}
              onMouseEnter={(e) => {
                if (!isOpManager && !checked) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(26,35,50,0.10)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isOpManager && !checked) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(26,35,50,0.06)";
                }
              }}
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

              {/* Avatar */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold transition-colors"
                style={avatarStyle}
              >
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: "var(--text-1)" }}
                  >
                    {op.fullName}
                  </p>
                  {!isOpManager && checked && (
                    <CheckCircleIcon className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                  )}
                </div>

                {op.matricule && (
                  <p
                    className="font-mono-data"
                    style={{ fontSize: "10px", color: "var(--text-3)" }}
                  >
                    #{op.matricule}
                  </p>
                )}

                <p className="mt-0.5 truncate" style={{ fontSize: "10px", color: "var(--text-3)" }}>
                  Sup.{" "}
                  <span style={{ fontWeight: 500, color: "var(--text-2)" }}>
                    {op.supervisorFullName ?? "—"}
                  </span>
                  {op.supervisorMatricule && (
                    <span className="font-mono-data"> ({op.supervisorMatricule})</span>
                  )}
                </p>
              </div>

              {/* Badge statut */}
              <span
                className="shrink-0 ds-pill"
                style={
                  op.free
                    ? { background: "var(--green-soft)", color: "var(--green)" }
                    : { background: "var(--red-soft)", color: "var(--red)" }
                }
              >
                {op.free ? (
                  <><CheckCircleIcon className="h-3 w-3" /> Libre</>
                ) : (
                  <><XCircleIcon className="h-3 w-3" /> Occupé</>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* ── Barre d'actions sticky ── */}
      {!isOpManager && (
        <div
          className="sticky bottom-0 flex items-center justify-between rounded-lg px-5 py-3 backdrop-blur"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid var(--border)",
            boxShadow: "0 -4px 16px rgba(26,35,50,0.08)",
          }}
        >
          <div>
            {selectedIds.length > 0 ? (
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>
                {selectedIds.length} opérateur{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span style={{ fontSize: "13px", color: "var(--text-3)" }}>
                Sélectionnez des opérateurs pour modifier leur statut
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              disabled={freePending}
              onClick={() => submit("free")}
              className="flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--green)" }}
            >
              <CheckCircleIcon className="h-4 w-4" />
              Marquer libre
            </button>

            <button
              disabled={busyPending}
              onClick={() => submit("busy")}
              className="flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--red)" }}
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
