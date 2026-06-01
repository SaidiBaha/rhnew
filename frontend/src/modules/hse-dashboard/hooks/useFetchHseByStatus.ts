import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { HseDashboardFilters, HseStatusDistributionItem } from "@/modules/hse-dashboard/types";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchHseByStatus(filters: HseDashboardFilters) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;

  return useQuery({
    queryKey: ["hse-by-status", filters],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await axios.get<HseStatusDistributionItem[]>(`${API}/hse/dashboard/by-status`, {
        params: filters,
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
  });
}
