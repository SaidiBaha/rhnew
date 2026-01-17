import type { Employee } from "@/modules/employee/types";
import type { User } from "@/modules/auth/types";

export type SalaryAdvance = {
  id: string;
  month: number;
  year: number;
  employee: Employee;
  amount: number;
  comment?: string;
  updatedAt: Date;
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
