import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { AuditStats } from "@/modules/audit/types";

export function useFetchAuditStats() {
  const { auth } = useAuth();
  return useQuery<AuditStats>({
    queryKey: ["audit-stats"],
    queryFn: async () => {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/audits/stats`, {
        headers: { Authorization: `Bearer ${auth?.accessToken}` },
      });
      return data;
    },
    enabled: !!auth?.accessToken,
  });
}
