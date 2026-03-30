import type { Employee } from "@/modules/employee/types";

export type UserRole = "ADMIN" | "SUPERVISOR" | "OPERATIONAL_MANAGER" | "INFIRMIERE";

export type User = {
  id: string;
 
  role: UserRole;
  employee: Employee;
};
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmationPassword: string;
}
