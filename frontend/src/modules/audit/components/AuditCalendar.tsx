import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar, AlignJustify, List } from "lucide-react";
import { useFetchAllAuditsForCalendar } from "@/modules/audit/hooks/useFetchAllAuditsForCalendar";
import type { Audit, AuditStatus } from "@/modules/audit/types";

type CalendarView = "month" | "week" | "list";

const STATUS_COLORS: Record<AuditStatus, { bg: string; text: string; dot: string }> = {
  EN_ATTENTE: { bg: "rgba(255,140,0,0.15)", text: "#b86f00", dot: "#ff8c00" },
  EN_COURS:   { bg: "rgba(47,107,255,0.15)", text: "#1a4acc", dot: "#2f6bff" },
  TERMINE:    { bg: "rgba(0,196,140,0.15)", text: "#007a58", dot: "#00c48c" },
  ANNULE:     { bg: "rgba(240,62,62,0.15)", text: "#c0392b", dot: "#f03e3e" },
  EN_RETARD:  { bg: "rgba(220,80,0,0.15)", text: "#a03000", dot: "#dc5000" },
};

const STATUS_LABELS: Record<AuditStatus, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS:   "En cours",
  TERMINE:    "Terminé",
  ANNULE:     "Annulé",
  EN_RETARD:  "En retard",
};

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface Props {
  canWrite: boolean;
  onCreateAudit: (date?: Date) => void;
  onEditAudit: (audit: Audit) => void;
}

export function AuditCalendar({ canWrite, onCreateAudit, onEditAudit }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);

  const { data: audits = [] } = useFetchAllAuditsForCalendar();

  // Map YYYY-MM-DD → Audit[]
  const auditsByDay = useMemo(() => {
    const map: Record<string, Audit[]> = {};
    audits.forEach((audit) => {
      if (!audit.date) return;
      const dayKey = audit.date.split("T")[0];
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(audit);
    });
    return map;
  }, [audits]);

  const getAuditsForDay = (day: Date): Audit[] =>
    auditsByDay[format(day, "yyyy-MM-dd")] ?? [];

  // Monthly grid
  const monthWeeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, [currentDate]);

  // Weekly days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Sorted list of all audits
  const sortedAudits = useMemo(
    () => [...audits].filter((a) => a.date).sort((a, b) => (a.date! < b.date! ? -1 : 1)),
    [audits]
  );

  const navPrev = () => {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
  };

  const navNext = () => {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
  };

  const headerLabel = useMemo(() => {
    if (view === "month")
      return format(currentDate, "MMMM yyyy", { locale: fr });
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
    }
    return "Tous les audits";
  }, [currentDate, view]);

  // ── Chip affiché dans la grille ──────────────────────────
  const AuditChip = ({ audit, compact = false }: { audit: Audit; compact?: boolean }) => {
    const s = STATUS_COLORS[audit.status];
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setSelectedAudit(audit); }}
        className="w-full text-left rounded px-1.5 py-0.5 text-xs truncate transition-opacity hover:opacity-75"
        style={{ background: s.bg, color: s.text }}
        title={`${audit.lineZone || "Audit #" + audit.id} — ${STATUS_LABELS[audit.status]}`}
      >
        <span className="flex items-center gap-1 min-w-0">
          <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
          <span className="truncate">
            {compact
              ? (audit.lineZone || "Audit #" + audit.id)
              : `${audit.lineZone || "Audit #" + audit.id}${audit.date ? " · " + format(parseISO(audit.date), "HH:mm") : ""}`
            }
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">

        {/* Navigation (mois/semaine) */}
        <div className="flex items-center gap-2">
          {view !== "list" && (
            <>
              <button
                onClick={navPrev}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg)]"
                style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span
                className="text-sm font-semibold capitalize min-w-[160px] text-center"
                style={{ color: "var(--text)" }}
              >
                {headerLabel}
              </span>
              <button
                onClick={navNext}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg)]"
                style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          {view === "list" && (
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {headerLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle de vue */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {([
              ["month", "Mois", Calendar],
              ["week", "Semaine", AlignJustify],
              ["list", "Liste", List],
            ] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: view === v ? "var(--accent)" : "var(--white)",
                  color: view === v ? "#fff" : "var(--text2)",
                  borderRight: v !== "list" ? "1px solid var(--border)" : "none",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {canWrite && (
            <button
              onClick={() => onCreateAudit()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Planifier un audit
            </button>
          )}
        </div>
      </div>

      {/* ── Légende statuts ────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        {(Object.entries(STATUS_COLORS) as [AuditStatus, (typeof STATUS_COLORS)[AuditStatus]][]).map(
          ([status, s]) => (
            <span key={status} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text2)" }}>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} />
              {STATUS_LABELS[status]}
            </span>
          )
        )}
      </div>

      {/* ── Vue Mensuelle ──────────────────────────────────── */}
      {view === "month" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--white)" }}>
          {/* Jours de la semaine */}
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
            {DAY_NAMES.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold" style={{ color: "var(--text2)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Semaines */}
          {monthWeeks.map((week, wi) => (
            <div
              key={wi}
              className="grid grid-cols-7"
              style={{ borderBottom: wi < monthWeeks.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              {week.map((day, di) => {
                const dayAudits = getAuditsForDay(day);
                const inMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={di}
                    onClick={() => canWrite && onCreateAudit(day)}
                    className="min-h-24 p-1.5 flex flex-col gap-1 transition-colors"
                    style={{
                      borderRight: di < 6 ? "1px solid var(--border)" : "none",
                      background: isToday ? "rgba(47,107,255,0.03)" : "transparent",
                      opacity: inMonth ? 1 : 0.4,
                      cursor: canWrite ? "pointer" : "default",
                    }}
                  >
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                      style={{
                        background: isToday ? "var(--accent)" : "transparent",
                        color: isToday ? "#fff" : inMonth ? "var(--text)" : "var(--muted)",
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayAudits.slice(0, 3).map((audit) => (
                        <AuditChip key={audit.id} audit={audit} compact />
                      ))}
                      {dayAudits.length > 3 && (
                        <span className="px-1 text-xs" style={{ color: "var(--muted)" }}>
                          +{dayAudits.length - 3} autre(s)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Vue Hebdomadaire ───────────────────────────────── */}
      {view === "week" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--white)" }}>
          {/* En-têtes jours */}
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={i}
                  className="px-2 py-3 text-center"
                  style={{ borderRight: i < 6 ? "1px solid var(--border)" : "none" }}
                >
                  <div className="text-xs font-semibold" style={{ color: "var(--text2)" }}>{DAY_NAMES[i]}</div>
                  <div
                    className="mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium"
                    style={{
                      background: isToday ? "var(--accent)" : "transparent",
                      color: isToday ? "#fff" : "var(--text)",
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Corps semaine */}
          <div className="grid grid-cols-7 min-h-48">
            {weekDays.map((day, i) => {
              const dayAudits = getAuditsForDay(day);
              return (
                <div
                  key={i}
                  onClick={() => canWrite && onCreateAudit(day)}
                  className="p-2 flex flex-col gap-1.5 transition-colors"
                  style={{
                    borderRight: i < 6 ? "1px solid var(--border)" : "none",
                    background: isSameDay(day, new Date()) ? "rgba(47,107,255,0.03)" : "transparent",
                    cursor: canWrite ? "pointer" : "default",
                  }}
                >
                  {dayAudits.map((audit) => (
                    <AuditChip key={audit.id} audit={audit} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Vue Liste ──────────────────────────────────────── */}
      {view === "list" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--white)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Date</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Ligne / Zone</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Employé assigné</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Modèle</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {sortedAudits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                    Aucun audit planifié
                  </td>
                </tr>
              ) : (
                sortedAudits.map((audit, i) => {
                  const s = STATUS_COLORS[audit.status];
                  return (
                    <tr
                      key={audit.id}
                      onClick={() => setSelectedAudit(audit)}
                      style={{
                        borderBottom: i < sortedAudits.length - 1 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                      }}
                      className="hover:bg-[var(--bg)] transition-colors"
                    >
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                        {audit.date
                          ? format(parseISO(audit.date), "EEE d MMM yyyy · HH:mm", { locale: fr })
                          : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text)" }}>
                        {audit.lineZone || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                        {audit.assignedEmployeeName || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                        {audit.templateTitle || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: s.bg, color: s.text }}
                        >
                          {STATUS_LABELS[audit.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Popup détail audit ─────────────────────────────── */}
      {selectedAudit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setSelectedAudit(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4"
            style={{ background: "var(--white)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold"
                style={{
                  background: STATUS_COLORS[selectedAudit.status].bg,
                  color: STATUS_COLORS[selectedAudit.status].text,
                }}
              >
                {STATUS_LABELS[selectedAudit.status]}
              </span>
              <button onClick={() => setSelectedAudit(null)} style={{ color: "var(--muted)" }}>
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <DetailRow
                label="Date"
                value={
                  selectedAudit.date
                    ? format(parseISO(selectedAudit.date), "EEEE d MMMM yyyy · HH:mm", { locale: fr })
                    : "—"
                }
              />
              <DetailRow label="Ligne / Zone" value={selectedAudit.lineZone || "—"} />
              <DetailRow label="Modèle checklist" value={selectedAudit.templateTitle || "—"} />
              <DetailRow label="Employé assigné" value={selectedAudit.assignedEmployeeName || "—"} />
              {selectedAudit.notes && <DetailRow label="Notes" value={selectedAudit.notes} />}
            </div>

            {canWrite && (
              <button
                onClick={() => {
                  setSelectedAudit(null);
                  onEditAudit(selectedAudit);
                }}
                className="w-full rounded-lg py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                Modifier l'audit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 pt-0.5 text-xs font-semibold" style={{ color: "var(--text2)" }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}
