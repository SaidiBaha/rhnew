import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { HseDashboardFilters, HseNonConformityReportItem } from "@/modules/hse-dashboard/types";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchHseReportNonConformities(filters: HseDashboardFilters, enabled = true) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;

  return useQuery({
    queryKey: ["hse-report-nc", filters],
    enabled: !!token && enabled,
    queryFn: async () => {
      const { data } = await axios.get<HseNonConformityReportItem[]>(`${API}/hse/reports/nonconformities`, {
        params: filters,
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
  });
}
