import type React from "react";
import type { DailyAttendance, PresenceStatus } from "../types";

/** Retourne l'heure courante en timezone Africa/Tunis au format "HH:MM". */
function nowTunis(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Calcule le statut d'un enregistrement de présence.
 *
 * PRÉSENT  → Entrée renseignée ET Motif vide/absent
 * ABSENT   → Motif contient "ABSENCE" (insensible casse)
 *            OU (Entrée absente ET heure de Fin planifiée dépassée)
 * PENDING  → aucune condition ci-dessus
 */
export function computeStatus(record: DailyAttendance): PresenceStatus {
  const hasClockIn =
    !!record.clockIn && record.clockIn !== "00:00";

  const hasAbsenceMotif =
    !!record.absenceReason &&
    record.absenceReason.toUpperCase().includes("ABSENCE");

  if (hasClockIn && !hasAbsenceMotif) return "PRESENT";

  if (hasAbsenceMotif) return "ABSENT";

  // Absent si pas d'entrée et que l'heure de fin planifiée est dépassée
  if (!hasClockIn && record.fin) {
    const current = nowTunis();
    if (record.fin <= current) return "ABSENT";
  }

  return "PENDING";
}

export const STATUS_LABEL: Record<PresenceStatus, string> = {
  PRESENT: "PRÉSENT",
  ABSENT: "ABSENT",
  PENDING: "EN ATTENTE",
};

export const STATUS_STYLE: Record<PresenceStatus, React.CSSProperties> = {
  PRESENT: {
    background: "rgba(0,196,140,0.12)",
    color: "#00a87a",
    border: "1px solid rgba(0,196,140,0.3)",
  },
  ABSENT: {
    background: "rgba(240,62,62,0.1)",
    color: "#f03e3e",
    border: "1px solid rgba(240,62,62,0.25)",
  },
  PENDING: {
    background: "rgba(154,163,184,0.15)",
    color: "#6b7699",
    border: "1px solid rgba(154,163,184,0.3)",
  },
};
