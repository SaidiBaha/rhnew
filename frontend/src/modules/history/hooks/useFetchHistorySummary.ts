import { useQuery, keepPreviousData } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { HistoryResponse } from "../types";

export function useFetchHistorySummary(dateFrom?: string, dateTo?: string) {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["history", "summary", dateFrom ?? null, dateTo ?? null],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;

      const { data } = await axios.get<HistoryResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/attendances/history`,
        { headers: { Authorization: `Bearer ${auth.accessToken}` }, params }
      );
      return data;
    },
    enabled: !!auth.accessToken,
    placeholderData: keepPreviousData,
  });
}
