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
};

export type UpdateAttendanceRequest = {
  clockIn: string | null;
  clockOut: string | null;
  absenceReason: string | null;
};
