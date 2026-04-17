import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle, AlertCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

import { useFetchSupervisorTracking, useSendReminder } from "@/modules/salary-advance/hooks/useSupervisorTracking";
import type { SupervisorTrackingRow, SupervisorTrackingStatut } from "@/modules/salary-advance/types";
import { useFetchSupervisors } from "@/modules/employee/hooks/useFetchSupervisors";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + " TND";
}

function fmtDateTime(s?: string) {
  if (!s) return "Jamais";
  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(s));
}

function StatutBadge({ statut }: { statut: SupervisorTrackingStatut }) {
  const config = {
    COMPLETE:  { label: "Complété",   bg: "#d1fae5", color: "#065f46" },
    PARTIEL:   { label: "Partiel",    bg: "#fef3c7", color: "#92400e" },
    EN_ATTENTE:{ label: "En attente", bg: "#fee2e2", color: "#991b1b" },
  }[statut] ?? { label: statut, bg: "var(--border)", color: "var(--text2)" };

  return (
    <span
      style={{
        background: config.bg,
        color: config.color,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {config.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, icon, onClick, active,
}: {
  label: string; value: string; sub?: string;
  accent: string; icon: React.ReactNode;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "20px 22px",
        borderRadius: "var(--radius)",
        background: "var(--white)",
        border: `1px solid ${active ? accent : "var(--border)"}`,
        borderLeft: `3px solid ${accent}`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        cursor: onClick ? "pointer" : "default",
        boxShadow: active ? `0 0 0 2px ${accent}33` : "none",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text2)", fontWeight: 700 }}>
          {label}
        </span>
        <span style={{ color: accent, opacity: 0.7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text2)" }}>{sub}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type FilterType = "all" | "completed" | "missing";

export function SupervisorTrackingClient() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { data, isLoading: trackingLoading } = useFetchSupervisorTracking();
  const { data: supervisors, isLoading: supLoading } = useFetchSupervisors();
  const sendReminder = useSendReminder();

  const isLoading = trackingLoading || supLoading;

  const handleRemind = (trackingId: string, fullName: string) => {
    sendReminder.mutate(trackingId, {
      onSuccess: () => toast.success(`Rappel envoyé à ${fullName}`),
      onError:   () => toast.error("Erreur lors de l'envoi du rappel"),
    });
  };

  const trackingBySupervisorId = useMemo(() => {
    const map = new Map<number, SupervisorTrackingRow>();
    (data?.rows ?? []).forEach((r) => map.set(r.supervisorId, r));
    return map;
  }, [data]);

  const rows: SupervisorTrackingRow[] = useMemo(() => {
    if (!supervisors?.length) return data?.rows ?? [];
    return supervisors.map((sup) => {
      const existing = trackingBySupervisorId.get(sup.id);
      if (existing) return existing;
      return {
        trackingId: `pending-${sup.id}`,
        supervisorId: sup.id,
        supervisorMatricule: sup.matricule,
        supervisorFullName: sup.fullName,
        department: "—",
        nbEmployees: 0,
        nbAvancesSaisies: 0,
        montantTotal: 0,
        statut: "EN_ATTENTE" as SupervisorTrackingStatut,
        attendanceImportId: "",
      };
    });
  }, [supervisors, trackingBySupervisorId, data]);

  const filtered = rows.filter((r) => {
    if (filter === "completed") return r.statut === "COMPLETE";
    if (filter === "missing")   return r.statut !== "COMPLETE";
    return true;
  });

  const nbCompleted = rows.filter((r) => r.statut === "COMPLETE").length;
  const nbMissing   = rows.filter((r) => r.statut !== "COMPLETE").length;
  const totalAmount = rows.reduce((sum, r) => sum + (r.montantTotal ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>
            Suivi avances superviseurs
          </h1>
          {data?.lastImportAt && (
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
              Dernier import : {fmtDateTime(data.lastImportAt)}
            </div>
          )}
        </div>
        <Link
          to="/salary-advances"
          style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
        >
          ← Retour aux avances
        </Link>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {isLoading ? (
          [1,2,3].map(k => (
            <div key={k} style={{ height: 100, borderRadius: "var(--radius)", background: "var(--border)", animation: "pulse 1.5s infinite" }} />
          ))
        ) : (
          <>
            <StatCard
              label="Avances complétées"
              value={String(nbCompleted)}
              sub="superviseurs ont complété"
              accent="var(--accent2)"
              icon={<CheckCircle size={18} />}
              onClick={() => setFilter(filter === "completed" ? "all" : "completed")}
              active={filter === "completed"}
            />
            <StatCard
              label="Avances manquantes"
              value={String(nbMissing)}
              sub="superviseurs n'ont pas complété"
              accent="var(--accent4)"
              icon={<AlertCircle size={18} />}
              onClick={() => setFilter(filter === "missing" ? "all" : "missing")}
              active={filter === "missing"}
            />
            <StatCard
              label="Total avances"
              value={fmtCurrency(totalAmount)}
              sub="montant total accordé"
              accent="var(--accent)"
              icon={<Clock size={18} />}
              onClick={() => setFilter("all")}
              active={filter === "all"}
            />
          </>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--white)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", background: "#f8f9fc" }}>
                {["Matricule", "Nom superviseur", "Département", "Nb employés", "Total avances", "Statut", "Dernière action", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      color: "var(--text2)",
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                    Chargement…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                    {filter === "completed"
                      ? "Aucun superviseur n'a complété ses avances."
                      : filter === "missing"
                      ? "Tous les superviseurs ont complété leurs avances."
                      : "Aucun superviseur trouvé."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.trackingId}
                    style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--bg)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono, monospace)", color: "var(--text2)", fontSize: 12 }}>
                      {row.supervisorMatricule}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text)" }}>
                      {row.supervisorFullName}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text2)" }}>
                      {row.department}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text2)", textAlign: "center" }}>
                      {row.nbEmployees}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono, monospace)", color: "var(--text)" }}>
                      {row.montantTotal > 0 ? fmtCurrency(row.montantTotal) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <StatutBadge statut={row.statut} />
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text2)", whiteSpace: "nowrap" }}>
                      {fmtDateTime(row.derniereActionAt)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {row.statut !== "COMPLETE" && (
                        <button
                          onClick={() => handleRemind(row.trackingId, row.supervisorFullName)}
                          disabled={sendReminder.isPending}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--accent)",
                            background: "transparent",
                            color: "var(--accent)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "var(--accent)";
                            (e.currentTarget as HTMLElement).style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                          }}
                        >
                          <Bell size={12} />
                          Relancer
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
