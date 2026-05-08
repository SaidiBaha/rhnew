import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { ChecklistTemplate, SaveTemplateRequest } from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useCreateTemplate() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async (data: SaveTemplateRequest) => {
      const res = await axios.post<ChecklistTemplate>(`${API_BASE_URL}/checklist-templates`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
    },
  });
}
