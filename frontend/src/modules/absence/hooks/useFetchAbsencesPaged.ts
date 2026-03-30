import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Absence, AbsenceFilters } from "@/modules/absence/types";
import type { PageResponse } from "@/modules/employee/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useFetchAbsencesPaged(
  page: number,
  size: number = 25,
  filters: AbsenceFilters = {}
) {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["absences", "paged", page, size, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, size };
      if (filters.dateFrom)            params.dateFrom            = filters.dateFrom;
      if (filters.dateTo)              params.dateTo              = filters.dateTo;
      if (filters.statut)              params.statut              = filters.statut;
      if (filters.search?.trim())      params.search              = filters.search.trim();
      if (filters.supervisorMatricule) params.supervisorMatricule = filters.supervisorMatricule;
      if (filters.horaire)             params.horaire             = filters.horaire;

      const { data } = await axios.get<PageResponse<Absence>>("/absences", {
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