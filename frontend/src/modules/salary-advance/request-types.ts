export type SalaryAdvanceRequestStatus = "EN_COURS" | "DONE";

export type SalaryAdvanceRequestRow = {
  id: number;
  requesterId: number | null;
  requesterMatricule: string | null;
  requesterFullName: string | null;
  amount: number;
  comment: string | null;
  status: SalaryAdvanceRequestStatus;
  createdAt: string | null;
  updatedAt: string | null;
  processedAt: string | null;
  processedByFullName: string | null;
};

export type SalaryAdvanceRequestCreatePayload = {
  amount: number;
  comment?: string;
};

export type SalaryAdvanceRequestDashboard = {
  totalRequests: number;
  enCoursCount: number;
  doneCount: number;
  totalAmount: number;
  enCoursAmount: number;
  doneAmount: number;
  monthly: {
    label: string;
    total: number;
    enCours: number;
    done: number;
  }[];
};
