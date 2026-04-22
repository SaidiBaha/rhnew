import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useFetchUserActivity } from "@/modules/user-management/hooks/useFetchUserActivity";
import type { UserAdmin } from "@/modules/user-management/types";

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN:            { label: "Connexion",             color: "var(--accent2)" },
  LOGOUT:           { label: "Déconnexion",            color: "var(--muted)" },
  LOGIN_FAILED:     { label: "Connexion échouée",      color: "var(--accent4)" },
  PASSWORD_CHANGE:  { label: "Modif. mot de passe",   color: "var(--accent3)" },
  ACCOUNT_BLOCKED:  { label: "Compte bloqué",          color: "var(--accent4)" },
  ACCOUNT_UNBLOCKED:{ label: "Compte débloqué",        color: "var(--accent2)" },
  ROLE_CHANGED:     { label: "Rôle modifié",           color: "var(--accent)" },
};

const EVENT_TYPES = ["", "LOGIN", "LOGOUT", "LOGIN_FAILED", "PASSWORD_CHANGE", "ACCOUNT_BLOCKED", "ACCOUNT_UNBLOCKED", "ROLE_CHANGED"];

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

interface Props {
  user: UserAdmin;
  onClose: () => void;
}

export function UserActivityModal({ user, onClose }: Props) {
  const [page, setPage]           = useState(0);
  const [eventType, setEventType] = useState("");
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");

  const { data, isLoading } = useFetchUserActivity({
    userId: user.id,
    eventType: eventType || undefined,
    from: from ? from + "T00:00:00" : undefined,
    to: to   ? to   + "T23:59:59" : undefined,
    page,
    size: 15,
  });

  const totalPages = data?.totalPages ?? 1;

  function getEventStyle(type: string) {
    return EVENT_LABELS[type] ?? { label: type, color: "var(--text2)" };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="flex flex-col w-full max-w-3xl rounded-2xl shadow-2xl"
        style={{
          background: "var(--white)",
          border: "1px solid var(--border)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              Journal d'activité
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {user.fullName ?? user.matricule}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg)]"
            style={{ color: "var(--muted)" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div
          className="flex flex-wrap gap-3 px-6 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
        >
          <select
            value={eventType}
            onChange={(e) => { setEventType(e.target.value); setPage(0); }}
            className="rounded-lg border px-3 py-1.5 text-sm outline-none"
            style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
          >
            <option value="">Tous les événements</option>
            {EVENT_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{EVENT_LABELS[t]?.label ?? t}</option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(0); }}
            className="rounded-lg border px-3 py-1.5 text-sm outline-none"
            style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(0); }}
            className="rounded-lg border px-3 py-1.5 text-sm outline-none"
            style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
          />
          {(eventType || from || to) && (
            <button
              onClick={() => { setEventType(""); setFrom(""); setTo(""); setPage(0); }}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "var(--accent4)", background: "rgba(240,62,62,0.08)" }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>
              Chargement…
            </div>
          ) : !data || data.content.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>
              Aucune activité enregistrée
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Événement</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Date & Heure</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>IP</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Détail</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((log, i) => {
                  const { label, color } = getEventStyle(log.eventType);
                  return (
                    <tr
                      key={log.id}
                      style={{ borderBottom: i < data.content.length - 1 ? "1px solid var(--border)" : "none" }}
                      className="hover:bg-[var(--bg)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{ background: color + "22", color }}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>
                        {fmt(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>
                        {log.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                        {log.detail ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-6 py-3 shrink-0"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {data.totalElements} événement{data.totalElements > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first}
                className="rounded-lg p-1.5 disabled:opacity-40 transition-colors hover:bg-[var(--bg)]"
                style={{ color: "var(--text2)" }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs" style={{ color: "var(--text2)" }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={data.last}
                className="rounded-lg p-1.5 disabled:opacity-40 transition-colors hover:bg-[var(--bg)]"
                style={{ color: "var(--text2)" }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
