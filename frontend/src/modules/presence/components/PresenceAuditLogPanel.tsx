import { useState } from "react";
import type { CSSProperties } from "react";
import { Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useFetchPresenceAuditLogs } from "../hooks/useFetchPresenceAuditLogs";
import useAuth from "@/hooks/useAuth";
import type { PresenceAuditLog } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  module: "PRESENCE_ABSENCE" | "HISTORIQUE_PRESENCE";
}

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

function nvl(v: string | null | undefined): string {
  return v ?? "—";
}

// ─── Action type badge ────────────────────────────────────────────────────────

function ActionBadge({ type }: { type: PresenceAuditLog["actionType"] }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    CREATION:     { bg: "rgba(0,196,140,0.1)",  color: "#007a58", label: "CRÉATION" },
    MODIFICATION: { bg: "rgba(47,107,255,0.1)", color: "#2f6bff", label: "MODIFICATION" },
    SUPPRESSION:  { bg: "rgba(240,62,62,0.1)",  color: "#c0392b", label: "SUPPRESSION" },
  };
  const s = styles[type] ?? styles.MODIFICATION;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PresenceAuditLogPanel({ module }: Props) {
  const { auth } = useAuth();
  const role = auth.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const [page, setPage] = useState(0);
  const [actionType, setActionType] = useState("");
  const [performedByFilter, setPerformedByFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fromIso = dateFrom ? dateFrom + "T00:00:00" : undefined;
  const toIso   = dateTo   ? dateTo   + "T23:59:59" : undefined;

  const { data, isLoading } = useFetchPresenceAuditLogs({
    module,
    actionType: actionType || undefined,
    performedByMatricule: performedByFilter || undefined,
    employeeMatricule: employeeFilter || undefined,
    from: fromIso,
    to: toIso,
    page,
    size: PAGE_SIZE,
  });

  const logs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? 0;

  function resetFilters() {
    setActionType("");
    setPerformedByFilter("");
    setEmployeeFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  }

  const hasActiveFilters = !!(actionType || performedByFilter || employeeFilter || dateFrom || dateTo);

  // ── Filter bar ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          padding: "14px 16px",
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        {/* Type d'action */}
        <select
          value={actionType}
          onChange={(e) => { setActionType(e.target.value); setPage(0); }}
          style={{
            height: 34,
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 13,
            color: "var(--text)",
            background: "var(--bg)",
            minWidth: 160,
          }}
        >
          <option value="">Tous les types</option>
          <option value="CREATION">Création</option>
          <option value="MODIFICATION">Modification</option>
          <option value="SUPPRESSION">Suppression</option>
        </select>

        {/* Filtre par utilisateur — admin uniquement */}
        {isAdmin && (
          <input
            type="text"
            placeholder="Matricule utilisateur…"
            value={performedByFilter}
            onChange={(e) => { setPerformedByFilter(e.target.value); setPage(0); }}
            style={{
              height: 34,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0 10px",
              fontSize: 13,
              color: "var(--text)",
              background: "var(--bg)",
              minWidth: 180,
            }}
          />
        )}

        {/* Filtre par employé */}
        <input
          type="text"
          placeholder="Matricule employé…"
          value={employeeFilter}
          onChange={(e) => { setEmployeeFilter(e.target.value); setPage(0); }}
          style={{
            height: 34,
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 13,
            color: "var(--text)",
            background: "var(--bg)",
            minWidth: 180,
          }}
        />

        {/* Dates */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          style={{
            height: 34,
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 13,
            color: "var(--text)",
            background: "var(--bg)",
          }}
          title="Date début"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          style={{
            height: 34,
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 13,
            color: "var(--text)",
            background: "var(--bg)",
          }}
          title="Date fin"
        />

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              height: 34,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--white)",
              color: "var(--text2)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <X size={13} />
            Effacer
          </button>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "48px 16px", color: "var(--muted)" }}>
            <Loader2 size={18} className="animate-spin" />
            <span style={{ fontSize: 14 }}>Chargement…</span>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center", fontSize: 14, color: "var(--muted)" }}>
            Aucun enregistrement trouvé.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  {[
                    "Date et heure",
                    "Utilisateur",
                    "Employé concerné",
                    "Type",
                    "Champ modifié",
                    "Ancienne valeur",
                    "Nouvelle valeur",
                    "IP",
                    "Détail",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: idx % 2 === 0 ? "var(--white)" : "var(--bg)",
                    }}
                  >
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--text2)", fontFamily: "monospace", fontSize: 12 }}>
                      {formatDateTime(entry.performedAt)}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 13 }}>
                        {nvl(entry.performedByFullName)}
                      </div>
                      {entry.performedByMatricule && (
                        <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>
                          {entry.performedByMatricule}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      {entry.employeeFullName ? (
                        <>
                          <div style={{ fontWeight: 500, color: "var(--text)", fontSize: 13 }}>
                            {entry.employeeFullName}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>
                            {entry.employeeMatricule}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--muted)", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <ActionBadge type={entry.actionType} />
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text2)" }}>
                      {nvl(entry.fieldChanged)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {entry.oldValue ? (
                        <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(240,62,62,0.07)", color: "#c0392b", fontSize: 12, fontFamily: "monospace" }}>
                          {entry.oldValue}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {entry.newValue ? (
                        <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(0,196,140,0.07)", color: "#007a58", fontSize: 12, fontFamily: "monospace" }}>
                          {entry.newValue}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {nvl(entry.ipAddress)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text2)", maxWidth: 320 }}>
                      <span title={entry.detail ?? ""} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {nvl(entry.detail)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
          <p style={{ fontSize: 13, color: "var(--text2)" }}>
            {totalElements === 0
              ? "Aucun résultat"
              : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalElements)} sur ${totalElements} entrée${totalElements > 1 ? "s" : ""}`}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              style={pageBtnStyle(page === 0)}
              title="Première page"
            >«</button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={pageBtnStyle(page === 0)}
              title="Page précédente"
            ><ChevronLeft size={14} /></button>
            <span style={{ padding: "0 12px", fontSize: 13, fontWeight: 500, color: "var(--text2)" }}>
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={pageBtnStyle(page >= totalPages - 1)}
              title="Page suivante"
            ><ChevronRight size={14} /></button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              style={pageBtnStyle(page >= totalPages - 1)}
              title="Dernière page"
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
}

function pageBtnStyle(disabled: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--white)",
    color: "var(--text2)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontSize: 13,
  };
}
