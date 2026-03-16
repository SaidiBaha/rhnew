import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import useAuth from "@/hooks/useAuth";
import type { Employee, PageResponse } from "@/modules/employee/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type Filters = {
  productionLine?: string;
  shift?: string;
  employmentType?: string;
  hireDateFrom?: string;
  hireDateTo?: string;
};

export function useFetchEmployeesPaged(
  page: number,
  size: number = 25,
  search: string = "",
  filters: Filters = {}
) {
  const { auth } = useAuth();
  const { productionLine, shift, employmentType, hireDateFrom, hireDateTo } = filters;

  return useQuery({
    queryKey: ["employees", "paged", page, size, search, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, size };
      if (search.trim()) params.search = search.trim();
      if (productionLine) params.productionLine = productionLine;
      if (shift) params.shift = shift;
      if (employmentType) params.employmentType = employmentType;
      if (hireDateFrom) params.hireDateFrom = hireDateFrom;
      if (hireDateTo) params.hireDateTo = hireDateTo;

      const { data } = await axios.get<PageResponse<Employee>>("/employees/pagination", {
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        params,
      });
      return data;
    },
    enabled: !!auth.user?.id,
    placeholderData: (prev) => prev,
  });
}
