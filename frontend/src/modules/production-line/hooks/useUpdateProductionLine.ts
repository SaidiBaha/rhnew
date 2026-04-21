import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { ProductionLineRequest } from "@/modules/production-line/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useUpdateProductionLine() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductionLineRequest }) => {
      const res = await axios.put(`${API_BASE_URL}/production-lines/${id}`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-lines"] });
      queryClient.invalidateQueries({ queryKey: ["production-lines-admin"] });
    },
  });
}
