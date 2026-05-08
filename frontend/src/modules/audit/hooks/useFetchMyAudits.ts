import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Audit } from "@/modules/audit/types";

export function useFetchMyAudits() {
  const { auth } = useAuth();
  return useQuery<Audit[]>({
    queryKey: ["my-audits"],
    queryFn: async () => {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/audits/my-audits`, {
        headers: { Authorization: `Bearer ${auth?.accessToken}` },
      });
      return data;
    },
    enabled: !!auth?.accessToken,
  });
}
