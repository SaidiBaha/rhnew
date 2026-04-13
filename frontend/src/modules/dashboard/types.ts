// ─── Existing types (kept) ────────────────────────────────────────────────────
export type ProjectHoursRow = {
  idProjet: number;
  nomProjet: string;
  idSuperviseur: number | null;
  nomSuperviseur: string;
  matriculeSuperviseur?: string | null;
  heuresAjoutees: number;
  heuresTransferees: number;
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export type DashboardPeriod = "today" | "week" | "month" | "custom";

export type EvolutionPoint = {
  date: string;
  present: number;
  absent: number;
  pending: number;
};

export type DeptAbsence = {
  dept: string;
  absent: number;
};

export type PresenceSection = {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  pendingToday: number;
  rateToday: number;
  deltaPresentVsPrev: number;
  deltaAbsentVsPrev: number;
  chartEvolution: EvolutionPoint[];
  chartByDept: DeptAbsence[];
};

export type AdvanceStatusPoint = {
  period: string;
  done: number;
  enCours: number;
};

export type DeptAvgAmount = {
  dept: string;
  avgAmount: number;
};

export type AdvanceSection = {
  totalRequests: number;
  totalAmountDone: number;
  enCoursCount: number;
  approvalRate: number | null;
  deltaRequests: number;
  chartStatus: AdvanceStatusPoint[];
  chartAvgByDept: DeptAvgAmount[];
};

export type UnjustifiedAbsenceAlert = {
  matricule: string;
  fullName: string;
  days: number;
};

export type PendingAdvanceAlert = {
  fullName: string;
  amount: number;
  daysAgo: number;
};

export type AlertsSection = {
  unjustifiedAbsences: UnjustifiedAbsenceAlert[];
  pendingAdvances: PendingAdvanceAlert[];
  lastImportDate: string | null;
};

export type RecentAdvance = {
  fullName: string;
  amount: number;
  date: string;
  status: string;
};

export type RecentAbsence = {
  fullName: string;
  dept: string;
  date: string;
  absenceReason: string;
};

export type AdminDashboard = {
  presence: PresenceSection;
  advances: AdvanceSection;
  alerts: AlertsSection;
  recentAdvances: RecentAdvance[];
  recentAbsences: RecentAbsence[];
};
