import { format } from "date-fns";
import { fr } from "date-fns/locale";

import type { SalaryAdvanceColumn } from "@/modules/salary-advance/components/columns";
import type { SalaryAdvance } from "@/modules/salary-advance/types";
import { formatEmployee } from "@/modules/employee/utils";

export function formatSalaryAdvance(
  salaryAdvance: SalaryAdvance
): SalaryAdvanceColumn {
  return {
    id: salaryAdvance.id,
    month: salaryAdvance.month,
    year: salaryAdvance.year,
    amount: salaryAdvance.amount,
    comment: salaryAdvance.comment || "",
    employee: formatEmployee(salaryAdvance.employee),
    createdAt: salaryAdvance.createdAt
      ? format(salaryAdvance.createdAt, "dd MMMM yyyy HH:mm", { locale: fr })
      : "",
    updatedAt: salaryAdvance.updatedAt
      ? format(salaryAdvance.updatedAt, "dd MMMM HH:mm", { locale: fr })
      : "",
    createdBy: salaryAdvance.createdBy?.employee.fullName || "",
    updatedBy: salaryAdvance.updatedBy?.employee.fullName || "",
  };
}
