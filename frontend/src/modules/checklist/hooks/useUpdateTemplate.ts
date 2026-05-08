import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { ChecklistTemplate, SaveTemplateRequest } from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useUpdateTemplate() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SaveTemplateRequest }) => {
      const res = await axios.put<ChecklistTemplate>(`${API_BASE_URL}/checklist-templates/${id}`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-templates", vars.id] });
    },
  });
}
