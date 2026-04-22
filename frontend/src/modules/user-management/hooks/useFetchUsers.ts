import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { UserAdmin } from "@/modules/user-management/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchUsers() {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;

  return useQuery({
    queryKey: ["admin-users"],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<UserAdmin[]>(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
  });
}
