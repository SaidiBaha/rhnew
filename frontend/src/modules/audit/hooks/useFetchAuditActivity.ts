import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { AuditActivityLog } from "@/modules/audit/types";

export function useFetchAuditActivity(auditId: number | null) {
  const { auth } = useAuth();
  return useQuery<AuditActivityLog[]>({
    queryKey: ["audit-activity", auditId],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/audits/${auditId}/activity`,
        { headers: { Authorization: `Bearer ${auth?.accessToken}` } }
      );
      return data;
    },
    enabled: !!auth?.accessToken && auditId != null,
  });
}
