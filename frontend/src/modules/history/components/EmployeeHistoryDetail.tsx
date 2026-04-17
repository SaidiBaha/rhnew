import { useState } from "react";
import { ArrowLeft, CalendarDays, Users, Loader2 } from "lucide-react";
import { useFetchEmployeeHistory } from "../hooks/useFetchEmployeeHistory";
import { useUpdateHistoryAttendance } from "../hooks/useUpdateHistoryAttendance";
import { computeStatus, STATUS_LABEL, STATUS_STYLE } from "@/modules/presence/utils/status";
import type { HistoryFilter, HistoryDailyRecord } from "../types";
import type { DailyAttendance } from "@/modules/presence/types";
import { FilterBar } from "./FilterBar";
import { X } from "lucide-react";
import { useEffect } from "react";
import useAuth from "@/hooks/useAuth";

/* ── Adapter: HistoryDailyRecord → DailyAttendance (for computeStatus) ── */
function toPresenceRecord(r: HistoryDailyRecord): DailyAttendance {
  return {
    id: r.id,
    matricule: r.matricule,
    fullName: r.fullName,
    department: r.department,
    horaire: r.horaire,
    debut: r.debut,
    fin: r.fin,
    clockIn: r.clockIn,
    clockOut: r.clockOut,
    absenceReason: r.absenceReason,
    appele: false,        // ← add
    appeleAt: null,      // ← add
    appeleBy: null,      // ← add
  };
}

/* ── Inline edit modal (adapted for history, invalidates history queries) */
function EditModal({
  record,
  onClose,
}: {
  record: HistoryDailyRecord | null;
  onClose: () => void;
}) {
  const [clockIn, setClockIn]   = useState("");
  const [clockOut, setClockOut] = useState("");
  const [motif, setMotif]       = useState("");
  const update = useUpdateHistoryAttendance();

  useEffect(() => {
    if (!record) return;
    setClockIn(record.clockIn && record.clockIn !== "00:00" ? record.clockIn : "");
    setClockOut(record.clockOut && record.clockOut !== "00:00" ? record.clockOut : "");
    setMotif(record.absenceReason ?? "");
  }, [record]);

  if (!record) return null;

  const preview: DailyAttendance = {
    ...toPresenceRecord(record),
    clockIn:       clockIn  || null,
    clockOut:      clockOut || null,
    absenceReason: motif.trim() || null,
  };
  const status = computeStatus(preview);

  async function handleSave() {
    if (!record) return;
    await update.mutateAsync({
      id: record.id,
      data: {
        clockIn:       clockIn.trim()  || null,
        clockOut:      clockOut.trim() || null,
        absenceReason: motif.trim()    || null,
      },
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--white)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
              Éditer le pointage
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>
              {record.fullName} — <span className="font-mono-data">{record.date}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            style={{ color: "var(--muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live status */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text2)" }}>Statut :</span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={STATUS_STYLE[status]}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {[
            { label: "Heure d'entrée",  type: "time",  val: clockIn,  set: setClockIn  },
            { label: "Heure de sortie", type: "time",  val: clockOut, set: setClockOut },
            { label: "Motif",           type: "text",  val: motif,    set: setMotif,   placeholder: "Ex : ABSENCE-N-Justifié, MISSION…" },
          ].map(({ label, type, val, set, placeholder }) => (
            <div key={label}>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                {label}
              </label>
              <input
                type={type}
                value={val}
                placeholder={placeholder}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--white)" }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={update.isPending}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail table row ─────────────────────────────────────────────────── */
function DetailRow({
  record,
  onEdit,
  canEdit,
}: {
  record: HistoryDailyRecord;
  onEdit: (r: HistoryDailyRecord) => void;
  canEdit: boolean;
}) {
  const status = computeStatus(toPresenceRecord(record));

  return (
    <tr className="border-b transition-colors hover:bg-[#f7f9fe]" style={{ borderColor: "var(--border)" }}>
      <td className="px-4 py-3 font-mono-data text-sm" style={{ color: "var(--text2)" }}>
        {record.date}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: "var(--text2)" }}>
        {record.horaire ?? "—"}
      </td>
      <td className="px-4 py-3 font-mono-data text-sm" style={{ color: "var(--text2)" }}>
        {record.debut ?? "—"}
      </td>
      <td className="px-4 py-3 font-mono-data text-sm" style={{ color: "var(--text2)" }}>
        {record.fin ?? "—"}
      </td>
      <td className="px-4 py-3 font-mono-data text-sm" style={{ color: "var(--text)" }}>
        {record.clockIn ?? "—"}
      </td>
      <td className="px-4 py-3 font-mono-data text-sm" style={{ color: "var(--text)" }}>
        {record.clockOut ?? "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={STATUS_STYLE[status]}
        >
          {STATUS_LABEL[status]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: "var(--text2)" }}>
        {record.absenceReason ?? "—"}
      </td>
      <td className="px-4 py-3 text-right">
        {canEdit && (
          <button
            onClick={() => onEdit(record)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            Modifier
          </button>
        )}
      </td>
    </tr>
  );
}

/* ── Main detail component ────────────────────────────────────────────── */
interface Props {
  matricule: string;
  dateFrom?: string;
  dateTo?: string;
  filter: HistoryFilter;
  customFrom: string;
  customTo: string;
  onFilterChange: (f: HistoryFilter, from: string, to: string) => void;
  onBack: () => void;
}

export function EmployeeHistoryDetail({
  matricule,
  dateFrom,
  dateTo,
  filter,
  customFrom,
  customTo,
  onFilterChange,
  onBack,
}: Props) {
  const [editing, setEditing] = useState<HistoryDailyRecord | null>(null);
  const { data: records = [], isLoading } = useFetchEmployeeHistory(matricule, dateFrom, dateTo);
  const { auth } = useAuth();
  const canEdit = auth.user?.role
    ? (["ADMIN", "SUPER_ADMIN", "SUPERVISOR"] as string[]).includes(auth.user.role)
    : false;

  const presentDays = records.filter((r) => computeStatus(toPresenceRecord(r)) === "PRESENT").length;
  const absentDays  = records.filter((r) => computeStatus(toPresenceRecord(r)) === "ABSENT").length;

  const firstRecord = records[0];
  const employeeName = firstRecord?.fullName ?? matricule;

  return (
    <>
      <div className="flex flex-col gap-5 p-6">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[#e4e8f0]"
            style={{ color: "var(--text2)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="h-4 w-px" style={{ background: "var(--border)" }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              {employeeName}
            </h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Matricule <span className="font-mono-data">{matricule}</span>
              {firstRecord?.department && ` · ${firstRecord.department}`}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar
          filter={filter}
          customFrom={customFrom}
          customTo={customTo}
          onFilterChange={onFilterChange}
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 max-w-lg">
          <div
            className="flex items-center gap-4 rounded-2xl p-5"
            style={{ background: "var(--white)", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "#00c48c18" }}
            >
              <Users className="h-5 w-5" style={{ color: "#00a573" }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                {isLoading ? "…" : presentDays}
              </div>
              <div className="text-xs font-medium mt-0.5" style={{ color: "var(--text2)" }}>
                Jours présents
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-4 rounded-2xl p-5"
            style={{ background: "var(--white)", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "#f03e3e18" }}
            >
              <CalendarDays className="h-5 w-5" style={{ color: "#c0392b" }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                {isLoading ? "…" : absentDays}
              </div>
              <div className="text-xs font-medium mt-0.5" style={{ color: "var(--text2)" }}>
                Jours absents
              </div>
            </div>
          </div>
        </div>

        {/* Detail table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--white)", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {records.length} enregistrement{records.length > 1 ? "s" : ""}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16" style={{ color: "var(--muted)" }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>
              Aucune donnée pour la période sélectionnée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                    {["Date", "Horaire", "Début", "Fin", "Entrée", "Sortie", "Statut", "Motif", ...(canEdit ? [""] : [])].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <DetailRow key={r.id} record={r} onEdit={setEditing} canEdit={canEdit} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <EditModal record={editing} onClose={() => setEditing(null)} />
    </>
  );
}
