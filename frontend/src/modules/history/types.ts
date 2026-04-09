export type HistoryFilter = "today" | "week" | "month" | "custom" | "all";

export type HistoryEmployeeSummary = {
  matricule: string;
  fullName: string;
  department: string | null;
  presentDays: number;
  absentDays: number;
};

export type HistoryResponse = {
  totalPresent: number;
  totalAbsent: number;
  presenceRate: number;
  employees: HistoryEmployeeSummary[];
};

/** Un enregistrement journalier — même champs que DailyAttendance + date. */
export type HistoryDailyRecord = {
  id: number;
  date: string;           // "YYYY-MM-DD"
  matricule: string;
  fullName: string;
  department: string | null;
  horaire: string | null;
  debut: string | null;   // "HH:mm"
  fin: string | null;     // "HH:mm"
  clockIn: string | null; // "HH:mm"
  clockOut: string | null;// "HH:mm"
  absenceReason: string | null;
};
