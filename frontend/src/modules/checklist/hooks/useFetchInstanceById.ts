import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { ChecklistInstance } from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchInstanceById(id: number | null) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useQuery({
    queryKey: ["checklist-instances", id],
    enabled: !!token && id !== null,
    queryFn: async () => {
      const res = await axios.get<ChecklistInstance>(`${API_BASE_URL}/checklist-instances/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
  });
}
