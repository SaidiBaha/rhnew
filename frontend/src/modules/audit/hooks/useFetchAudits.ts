import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { AuditsPage } from "@/modules/audit/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchAudits(page = 0, size = 20) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useQuery({
    queryKey: ["audits", page, size],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<AuditsPage>(`${API_BASE_URL}/audits`, {
        params: { page, size },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
  });
}
