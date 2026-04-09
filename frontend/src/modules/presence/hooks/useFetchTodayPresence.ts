import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { DailyAttendance } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useFetchTodayPresence = () => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["presence", "today"],
    queryFn: async () => {
      const { data } = await axios.get<DailyAttendance[]>("/attendances/today", {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      return data;
    },
    enabled: !!auth.user?.id,
  });
};
