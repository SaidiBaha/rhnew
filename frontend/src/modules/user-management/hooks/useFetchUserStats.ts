import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { UserStats } from "@/modules/user-management/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchUserStats() {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;

  return useQuery({
    queryKey: ["admin-user-stats"],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<UserStats>(`${API_BASE_URL}/admin/users/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
  });
}
