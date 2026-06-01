import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { HseDashboardFilters, HseLateAuditReportItem } from "@/modules/hse-dashboard/types";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchHseReportLate(filters: HseDashboardFilters, enabled = true) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;

  return useQuery({
    queryKey: ["hse-report-late", filters],
    enabled: !!token && enabled,
    queryFn: async () => {
      const { data } = await axios.get<HseLateAuditReportItem[]>(`${API}/hse/reports/late`, {
        params: filters,
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
  });
}
