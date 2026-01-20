// src/modules/employee/hooks/useFetchAvailableOperators.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000/api/v1";

export type OperatorAvailability = {
  id: number;
  fullName: string;
  matricule?: string | null;
  free: boolean;
};

export function useFetchAvailableOperators() {
  const { auth } = useAuth();

  const token =
    (auth as any)?.accessToken ||
    (auth as any)?.token ||
    (auth as any)?.jwt ||
    null;

  return useQuery({
    queryKey: ["employees-availability"],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<OperatorAvailability[]>(
        `${API_BASE_URL}/employees`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        }
      );
      return res.data;
    },
  });
}
