import type { ChecklistInstance } from "@/modules/checklist/types";

export type AuditStatus = "EN_ATTENTE" | "EN_COURS" | "TERMINE" | "ANNULE" | "EN_RETARD";

export type Audit = {
  id: number;
  date?: string;
  lineZone?: string;
  templateId?: number;
  templateTitle?: string;
  templateItemCount?: number;
  assignedEmployeeId?: number;
  assignedEmployeeName?: string;
  assignedEmployeeMatricule?: string;
  assignedEmployeeEmail?: string;
  status: AuditStatus;
  notes?: string;
  instanceId?: number | null;
  instance?: ChecklistInstance | null;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  reminder24hSent?: boolean;
  reminderDaySent?: boolean;
  retardNotifSent?: boolean;
  filledCount?: number;
  totalCount?: number;
  scorePercent?: number;
};

export type AuditsPage = {
  content: Audit[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  first: boolean;
  last: boolean;
};

export type CreateAuditRequest = {
  date?: string;
  lineZone?: string;
  templateId?: number | null;
  assignedEmployeeId?: number | null;
  status?: AuditStatus;
  notes?: string;
  instanceId?: number | null;
};

export type AuditStats = {
  total: number;
  enAttente: number;
  enCours: number;
  termine: number;
  annule: number;
  enRetard: number;
  tauxCompletion: number;
};

export type AuditActivityLog = {
  id: number;
  auditId: number;
  eventType: string;
  performedById?: number;
  performedByName?: string;
  performedAt: string;
  detail?: string;
};

export type CadreEmployee = {
  id: number;
  fullName: string;
  matricule: string;
};
