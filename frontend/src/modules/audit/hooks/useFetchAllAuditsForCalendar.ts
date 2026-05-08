import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Audit } from "@/modules/audit/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchAllAuditsForCalendar() {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useQuery({
    queryKey: ["audits", "calendar"],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<{ content: Audit[] }>(`${API_BASE_URL}/audits`, {
        params: { page: 0, size: 500 },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data.content;
    },
  });
}
