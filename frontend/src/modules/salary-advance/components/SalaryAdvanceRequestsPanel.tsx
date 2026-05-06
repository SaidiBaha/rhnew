import { useMemo, useState, type FormEvent } from "react";

import useAuth from "@/hooks/useAuth";
import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import {
  useCreateSalaryAdvanceRequest,
  useFetchMySalaryAdvanceRequests,
} from "@/modules/salary-advance/hooks/useSalaryAdvanceRequests";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="ds-stat-card" style={{ borderLeft: `4px solid ${accent}` }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-3)",
        }}
      >
        {label}
      </div>
      <div
        className="mt-3 font-mono-data"
        style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-1)" }}
      >
        {value}
      </div>
    </div>
  );
}

export function SalaryAdvanceRequestsPanel() {
  const { auth } = useAuth();
  const isSupervisor = auth.user?.role === "SUPERVISOR";

  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");

  const createRequest = useCreateSalaryAdvanceRequest();
  const mineQuery = useFetchMySalaryAdvanceRequests(isSupervisor);

  const rows = mineQuery.data ?? [];

  const localStats = useMemo(() => {
    const total = rows.length;
    const enCours = rows.filter((row) => row.status === "EN_COURS").length;
    const done = rows.filter((row) => row.status === "DONE").length;
    return { total, enCours, done };
  }, [rows]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    await createRequest.mutateAsync({
      amount: parsedAmount,
      comment: comment.trim() || undefined,
    });

    setAmount("");
    setComment("");
  };

  if (!isSupervisor) {
    return null;
  }

  if (mineQuery.isLoading) {
    return <Loader />;
  }

  if (mineQuery.error) {
    return <ErrorAlert error="Impossible de charger le module des demandes d'avance." />;
  }

  return (
    <div className="space-y-5">
      <div
        className="ds-card px-6 py-5"
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "2px solid var(--border)",
        }}
      >
        <div
          className="absolute bottom-0 left-0 h-0.5 w-56"
          style={{ background: "linear-gradient(to right, var(--accent2), transparent)" }}
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "4px" }}>
              Module
              <span className="mx-2" style={{ color: "var(--border-mid)" }}>
                /
              </span>
              <span style={{ color: "var(--text-2)" }}>Demandes d&apos;avance</span>
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)" }}>
              Faire une demande d&apos;avance
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
              Le superviseur peut désormais faire une demande d&apos;avance pour lui-même.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleCreate} className="ds-card p-5 space-y-4">
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)" }}>
            Nouvelle demande
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-2)" }}>
              Montant demandé
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="ds-input h-11 w-full"
              placeholder="Ex: 250.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-2)" }}>
              Commentaire
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="ds-input min-h-28 w-full py-3"
              placeholder="Motif ou contexte de la demande..."
            />
          </div>
          <button
            type="submit"
            className="ds-btn-primary w-full justify-center"
            disabled={createRequest.isPending}
          >
            {createRequest.isPending ? "Envoi..." : "Envoyer la demande"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Mes demandes" value={localStats.total} accent="var(--accent)" />
            <StatCard label="En cours" value={localStats.enCours} accent="var(--accent3)" />
            <StatCard label="Done" value={localStats.done} accent="var(--accent2)" />
          </div>

          <div className="ds-card overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)" }}>
                Historique de mes demandes
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="ds-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Créée le</th>
                    <th>Montant</th>
                    <th>Commentaire</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center" style={{ color: "var(--text-3)" }}>
                        Aucune demande pour le moment.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-5 py-4">{formatDate(row.createdAt)}</td>
                        <td className="px-5 py-4 font-mono-data">{formatCurrency(row.amount)}</td>
                        <td className="px-5 py-4">{row.comment || "—"}</td>
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                            style={
                              row.status === "DONE"
                                ? { background: "rgba(22,163,74,0.12)", color: "#15803d" }
                                : { background: "rgba(245,158,11,0.14)", color: "#b45309" }
                            }
                          >
                            {row.status === "DONE" ? "Done" : "En cours"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
