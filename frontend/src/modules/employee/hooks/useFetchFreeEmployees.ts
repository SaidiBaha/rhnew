// src/modules/employee/hooks/useFetchFreeEmployees.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useFetchFreeEmployees() {
  const { auth } = useAuth();

  const token =
      (auth as any)?.accessToken ||
      (auth as any)?.token ||
      (auth as any)?.jwt ||
      null;

  return useQuery({
    queryKey: ["employees", "free"], // Clé distincte
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get(
          `${API_BASE_URL}/employees/free`,
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