import { useEffect, useState } from "react";
import { X } from "lucide-react";

const ABSENCE_MOTIFS = [
  "CONGE PAYE",
  "CONGE NON PAYE",
  "AUTORISATION AF-PER",
  "CHÔMAGE TECHNIQUE",
  "MALADIE CD",
  "MALADIE L-D",
];
import { computeStatus, STATUS_LABEL, STATUS_STYLE } from "../utils/status";
import { useUpdateAttendance } from "../hooks/useUpdateAttendance";
import type { DailyAttendance } from "../types";

interface Props {
  record: DailyAttendance | null;
  onClose: () => void;
}

export function EditAttendanceModal({ record, onClose }: Props) {
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [motif, setMotif] = useState("");

  const update = useUpdateAttendance();

  // Initialise les champs à l'ouverture
  useEffect(() => {
    if (!record) return;
    setClockIn(record.clockIn && record.clockIn !== "00:00" ? record.clockIn : "");
    setClockOut(record.clockOut && record.clockOut !== "00:00" ? record.clockOut : "");
    setMotif(record.absenceReason ?? "");
  }, [record]);

  if (!record) return null;

  // Statut calculé en temps réel depuis les valeurs du formulaire
  const preview: DailyAttendance = {
    ...record,
    clockIn: clockIn || null,
    clockOut: clockOut || null,
    absenceReason: motif.trim() || null,
  };
  const status = computeStatus(preview);

  async function handleSave() {
    if (!record) return;
    await update.mutateAsync({
      id: record.id,
      data: {
        clockIn: clockIn.trim() || null,
        clockOut: clockOut.trim() || null,
        absenceReason: motif.trim() || null,
      },
    });
    onClose();
  }

  return (
    /* Backdrop */
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
              {record.fullName} — <span className="font-mono-data">{record.matricule}</span>
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

        {/* Statut calculé */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text2)" }}>
            Statut :
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={STATUS_STYLE[status]}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Champs */}
        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              Heure d'entrée
            </label>
            <input
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
                background: "var(--white)",
              }}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              Heure de sortie
            </label>
            <input
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
                background: "var(--white)",
              }}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              Motif
            </label>
            <select
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                color: motif ? "var(--text)" : "var(--muted)",
                background: "var(--white)",
              }}
            >
              <option value="">— Aucun motif —</option>
              {ABSENCE_MOTIFS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
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
