import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { UserActivityPage } from "@/modules/user-management/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface Params {
  userId: number | null;
  eventType?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export function useFetchUserActivity({ userId, eventType, from, to, page = 0, size = 20 }: Params) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;

  return useQuery({
    queryKey: ["admin-user-activity", userId, eventType, from, to, page, size],
    enabled: !!token && !!userId,
    queryFn: async () => {
      const params: Record<string, string | number> = { page, size };
      if (eventType) params.eventType = eventType;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await axios.get<UserActivityPage>(`${API_BASE_URL}/admin/users/${userId}/activity`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return res.data;
    },
  });
}
