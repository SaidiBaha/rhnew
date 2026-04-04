import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { EmployeeAbsenceSummary } from "@/modules/absence/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface SummaryFilters {
  dateFrom?: string;
  dateTo?: string;
  departement?: string;
}

export function useFetchHistoriqueSummary(filters: SummaryFilters = {}) {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["absences", "historique", "summary", filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.dateFrom)    params.dateFrom    = filters.dateFrom;
      if (filters.dateTo)      params.dateTo      = filters.dateTo;
      if (filters.departement) params.departement = filters.departement;

      const { data } = await axios.get<EmployeeAbsenceSummary[]>("/absences/historique/summary", {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        params,
      });
      return data;
    },
    enabled: !!auth.user?.id,
    placeholderData: (prev) => prev,
  });
}
