// src/modules/employee/hooks/useFetchEmployees.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export type Employee = {
  id: number;
  fullName: string;
  matricule: string;
  free?: boolean; // Ajoutez ce champ si votre API le renvoie
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
    queryKey: ["employees", params], // Inclure les params dans la clé
    enabled: !!token,
    queryFn: async () => {
      const url = params?.includeAll 
        ? `${API_BASE_URL}/employees`
        : `${API_BASE_URL}/employees`;
      
      const res = await axios.get<Employee[]>(
          url,
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