import { useQuery, keepPreviousData } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { HistoryDailyRecord } from "../types";

export function useFetchEmployeeHistory(
  matricule: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["history", "employee", matricule, dateFrom ?? null, dateTo ?? null],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;

      const { data } = await axios.get<HistoryDailyRecord[]>(
        `${import.meta.env.VITE_API_BASE_URL}/attendances/history/${matricule}`,
        { headers: { Authorization: `Bearer ${auth.accessToken}` }, params }
      );
      return data;
    },
    enabled: !!auth.accessToken && !!matricule,
    placeholderData: keepPreviousData,
  });
}
