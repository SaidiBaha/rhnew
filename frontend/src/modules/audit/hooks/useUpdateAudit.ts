import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Audit, CreateAuditRequest } from "@/modules/audit/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useUpdateAudit() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateAuditRequest }) => {
      const res = await axios.put<Audit>(`${API_BASE_URL}/audits/${id}`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}
