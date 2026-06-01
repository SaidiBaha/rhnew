import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { HseDashboardFilters, HseConformityLevels } from "@/modules/hse-dashboard/types";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchHseConformityLevels(filters: HseDashboardFilters) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;

  return useQuery({
    queryKey: ["hse-conformity-levels", filters],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await axios.get<HseConformityLevels>(`${API}/hse/dashboard/conformity-levels`, {
        params: filters,
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
  });
}
