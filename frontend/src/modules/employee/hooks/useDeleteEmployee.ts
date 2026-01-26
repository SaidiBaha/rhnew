// src/modules/employee/hooks/useDeleteEmployee.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useDeleteEmployee() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const token = 
    (auth as any)?.accessToken ||
    (auth as any)?.token ||
    (auth as any)?.jwt ||
    null;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(
        `${API_BASE_URL}/api/v1/employees/${id}`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        }
      );
      return res.data;
    },
    onSuccess: () => {
      // Invalider et rafraîchir la liste des employés
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}