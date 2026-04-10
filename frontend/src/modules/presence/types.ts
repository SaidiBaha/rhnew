export type PresenceStatus = "PRESENT" | "ABSENT" | "PENDING";

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
