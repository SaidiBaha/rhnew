// src/modules/employee/hooks/useFetchEmployees.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export type Employee = {
  id: number;
  fullName: string;
  matricule: string;
  // ajoute d'autres champs si besoin
};

export function useFetchEmployees() {
  const { auth } = useAuth();

  const token =
      (auth as any)?.accessToken ||
      (auth as any)?.token ||
      (auth as any)?.jwt ||
      null;

  return useQuery({
    queryKey: ["employees"],      // ✅ plus de search dans la clé
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get<Employee[]>(
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
