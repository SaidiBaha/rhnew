import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { PresenceAuditLogsPage } from "../types";

const API = import.meta.env.VITE_API_BASE_URL;

export type AuditLogFilters = {
  module?: string;
  actionType?: string;
  performedByMatricule?: string;
  employeeMatricule?: string;
  from?: string; // ISO DateTime
  to?: string;   // ISO DateTime
  page?: number;
  size?: number;
};

export function useFetchPresenceAuditLogs(filters: AuditLogFilters = {}) {
  const { auth } = useAuth();

  return useQuery<PresenceAuditLogsPage>({
    queryKey: ["presence-audit-logs", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.module)                params.set("module", filters.module);
      if (filters.actionType)            params.set("actionType", filters.actionType);
      if (filters.performedByMatricule)  params.set("performedByMatricule", filters.performedByMatricule);
      if (filters.employeeMatricule)     params.set("employeeMatricule", filters.employeeMatricule);
      if (filters.from)                  params.set("from", filters.from);
      if (filters.to)                    params.set("to", filters.to);
      params.set("page", String(filters.page ?? 0));
      params.set("size", String(filters.size ?? 20));

      const { data } = await axios.get<PresenceAuditLogsPage>(
        `${API}/presence-audit-logs?${params.toString()}`,
        { headers: { Authorization: `Bearer ${auth.accessToken}` } }
      );
      return data;
    },
    placeholderData: (prev) => prev,
  });
}
