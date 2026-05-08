import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { ChecklistInstancesPage } from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchInstances(page = 0, size = 20) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useQuery({
    queryKey: ["checklist-instances", page, size],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<ChecklistInstancesPage>(`${API_BASE_URL}/checklist-instances`, {
        params: { page, size },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data;
    },
  });
}
