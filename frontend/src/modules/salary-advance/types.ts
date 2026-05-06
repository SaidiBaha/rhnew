import type { Employee } from "@/modules/employee/types";
import type { User } from "@/modules/auth/types";

// ─── Supervisor Advance Tracking ─────────────────────────────────────────────

export type SupervisorTrackingStatut = "EN_ATTENTE" | "PARTIEL" | "COMPLETE";

export type SupervisorTrackingRow = {
  trackingId: string;
  supervisorId: number;
  supervisorMatricule: string;
  supervisorFullName: string;
  department: string;
  nbEmployees: number;
  nbAvancesSaisies: number;
  montantTotal: number;
  statut: SupervisorTrackingStatut;
  derniereActionAt?: string;
  attendanceImportId: string;
  importedAt?: string;
};

export type SupervisorTrackingStats = {
  nbCompleted: number;
  nbMissing: number;
  totalAmount: number;
  lastImportAt?: string;
  lastImportId?: string;
  rows: SupervisorTrackingRow[];
};

export type SalaryAdvance = {
  id: string;
  month: number;
  year: number;
  employee: Employee;
  amount: number;
  comment?: string;
  createdAt?: Date | string;
  updatedAt: Date;
  createdBy?: User;
  updatedBy: User;
};

export type SalaryAdvanceUpdateRequest = {
  id: string;
  amount: number;
  comment?: string;
};

export type SalaryAdvanceDeadline = {
  id: string;
  month: number;
  year: number;
  deadline: string;
};
