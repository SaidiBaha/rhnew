import { useQuery, keepPreviousData } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { AdminDashboard, DashboardPeriod } from "@/modules/dashboard/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useFetchAdminDashboard(
  period: DashboardPeriod = "month",
  customFrom?: string,
  customTo?: string
) {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["admin-dashboard", period, customFrom ?? null, customTo ?? null],
    enabled: !!auth.accessToken,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, string> = { period };
      if (period === "custom" && customFrom) params.from = customFrom;
      if (period === "custom" && customTo)   params.to   = customTo;

      const { data } = await axios.get<AdminDashboard>("/dashboard/admin", {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        params,
      });
      return data;
    },
  });
}
