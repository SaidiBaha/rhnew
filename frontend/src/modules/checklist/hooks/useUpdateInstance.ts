import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { ChecklistInstance, SaveInstanceRequest } from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useUpdateInstance() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SaveInstanceRequest }) => {
      const res = await axios.put<ChecklistInstance>(`${API_BASE_URL}/checklist-instances/${id}`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["checklist-instances"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-instances", vars.id] });
    },
  });
}
