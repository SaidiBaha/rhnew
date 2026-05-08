import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Audit, CreateAuditRequest } from "@/modules/audit/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useCreateAudit() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async (data: CreateAuditRequest) => {
      const res = await axios.post<Audit>(`${API_BASE_URL}/audits`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}
