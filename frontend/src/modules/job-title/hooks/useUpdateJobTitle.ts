import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { JobTitleRequest } from "@/modules/job-title/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useUpdateJobTitle() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: JobTitleRequest }) => {
      const res = await axios.put(`${API_BASE_URL}/job-titles/${id}`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-titles"] });
    },
  });
}
