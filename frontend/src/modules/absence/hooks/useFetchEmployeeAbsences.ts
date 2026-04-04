import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Absence, AbsenceStatut } from "@/modules/absence/types";
import type { PageResponse } from "@/modules/employee/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface EmployeeAbsenceFilters {
  dateFrom?: string;
  dateTo?: string;
  statut?: AbsenceStatut | "";
}

export function useFetchEmployeeAbsences(
  matricule: string | null,
  page: number,
  size: number = 50,
  filters: EmployeeAbsenceFilters = {}
) {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["absences", "employee", matricule, page, size, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, size };
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo)   params.dateTo   = filters.dateTo;
      if (filters.statut)   params.statut   = filters.statut;

      const { data } = await axios.get<PageResponse<Absence>>(
        `/absences/employee/${matricule}`,
        {
          baseURL: API_BASE_URL,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
          params,
        }
      );
      return data;
    },
    enabled: !!auth.user?.id && !!matricule,
    placeholderData: (prev) => prev,
  });
}
