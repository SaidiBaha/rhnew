import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import useAuth from "@/hooks/useAuth";
import type { Employee, PageResponse } from "@/modules/employee/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useFetchEmployeesPaged(page: number, size: number = 25, search: string = "") {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["employees", "paged", page, size, search],
    queryFn: async () => {
      const { data } = await axios.get<PageResponse<Employee>>("/employees/pagination", {
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        params: { page, size, ...(search.trim() ? { search: search.trim() } : {}) },
      });
      return data;
    },
    enabled: !!auth.user?.id,
    placeholderData: (prev) => prev,
  });
}
