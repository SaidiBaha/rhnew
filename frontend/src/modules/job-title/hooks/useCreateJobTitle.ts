import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { JobTitleRequest } from "@/modules/job-title/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useCreateJobTitle() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async (data: JobTitleRequest) => {
      const res = await axios.post(`${API_BASE_URL}/job-titles`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-titles"] });
    },
  });
}
