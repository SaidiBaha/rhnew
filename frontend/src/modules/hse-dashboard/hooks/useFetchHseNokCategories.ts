import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { HseDashboardFilters, HseNokCategoryItem } from "@/modules/hse-dashboard/types";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchHseNokCategories(filters: HseDashboardFilters) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;

  return useQuery({
    queryKey: ["hse-nok-categories", filters],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await axios.get<HseNokCategoryItem[]>(`${API}/hse/dashboard/nok-categories`, {
        params: filters,
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
  });
}
