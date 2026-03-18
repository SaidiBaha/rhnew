import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { formatEmployee } from "@/modules/employee/utils";
import type { RequestColumn } from "@/modules/request/components/columns";
import type { Request } from "@/modules/request/types";

export function formatRequest(request: Request): RequestColumn {
  const createdAt = new Date(request.createdAt);
  const y = createdAt.getFullYear();
  const m = String(createdAt.getMonth() + 1).padStart(2, "0");
  const d = String(createdAt.getDate()).padStart(2, "0");
  const createdAtLocalStr = `${y}-${m}-${d}`;

  return {
    id: request.id,
    requestType: request.requestType,
    comment: request.comment || "",
    status: request.status,
    employee: formatEmployee(request.employee),
    supervisor: request.employee.supervisor?.fullName || "—",
    createdAt: format(createdAt, "dd MMMM HH:mm", { locale: fr }),
    createdAtLocalStr,
    updatedAt: request.updatedAt
      ? format(new Date(request.updatedAt), "dd MMMM HH:mm", { locale: fr })
      : "",
    createdBy: request.createdBy.employee.fullName || "",
    updatedBy: request.updatedBy?.employee.fullName || "",
  };
}