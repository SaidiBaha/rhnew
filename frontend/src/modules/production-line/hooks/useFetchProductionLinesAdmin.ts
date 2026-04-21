import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { ProductionLine } from "@/modules/production-line/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useFetchProductionLinesAdmin() {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useQuery({
    queryKey: ["production-lines-admin"],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<ProductionLine[]>(`${API_BASE_URL}/production-lines/admin`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
  });
}
