// src/modules/employee/hooks/useFetchEmployees.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9001";

export type Employee = {
  id: number;
  fullName: string;
  matricule: string;
  free?: boolean;
};

type UseFetchEmployeesParams = {
  includeAll?: boolean;
};

export function useFetchEmployees(params?: UseFetchEmployeesParams) {
  const { auth } = useAuth();

  const token =
      (auth as any)?.accessToken ||
      (auth as any)?.token ||
      (auth as any)?.jwt ||
      null;

  return useQuery({
    queryKey: ["employees-hook", params],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get(
          `${API_BASE_URL}/employees`,
          {
            params: { page: 0, size: 1000 },
            headers: token
                ? { Authorization: `Bearer ${token}` }
                : undefined,
          }
      );
      return res.data?.content ?? res.data ?? [];
    },
  });
}