import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { CadreEmployee } from "@/modules/audit/types";

export function useFetchCadreEmployees() {
  const { auth } = useAuth();
  return useQuery<CadreEmployee[]>({
    queryKey: ["cadre-employees"],
    queryFn: async () => {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/audits/cadre-employees`, {
        headers: { Authorization: `Bearer ${auth?.accessToken}` },
      });
      return data;
    },
    enabled: !!auth?.accessToken,
  });
}
