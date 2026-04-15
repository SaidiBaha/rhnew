export type PresenceStatus = "PRESENT" | "ABSENT" | "PENDING";

/** Enregistrement produit par le parser XLSX du module présence, envoyé à /attendances/batch-save. */
export type PresenceImportRecord = {
  matricule: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalAttendance: string;
  overtime: string;
  absenceReason?: string;
  horaire?: string;
  debut?: string;
  fin?: string;
};

export type DailyAttendance = {
  id: number;
  matricule: string;
  fullName: string;
  department: string | null;
  horaire: string | null;
  debut: string | null;   // "HH:MM"
  fin: string | null;     // "HH:MM"
  clockIn: string | null;  // "HH:MM"
  clockOut: string | null; // "HH:MM"
  absenceReason: string | null;
  /** true si le NURSE a marqué cet employé comme "appelé". */
  appele: boolean;
  /** Heure de l'appel "HH:mm" (Africa/Tunis). null si non appelé. */
  appeleAt: string | null;
  /** ID du NURSE ayant effectué l'appel. null si non appelé. */
  appeleBy: number | null;
};

export type UpdateAttendanceRequest = {
  clockIn: string | null;
  clockOut: string | null;
  absenceReason: string | null;
};

/** Statut d'import du jour retourné par GET /attendances/today/status */
export type TodayImportStatus = {
  count: number;
  source: "XLSX_IMPORT" | "MANUAL_SUPERVISOR" | null;
};

/** Entrée par employé pour la saisie manuelle (POST /attendances/manual-entry) */
export type ManualPresenceEntry = {
  employeeId: number;
  present: boolean;
};

/** Corps de la requête POST /attendances/manual-entry */
export type ManualPresenceInput = {
  horaire: string;
  debut: string;
  fin: string;
  entries: ManualPresenceEntry[];
};
