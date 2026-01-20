// src/modules/employee/hooks/useUpdateOperatorsAvailability.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { EmployeeFreeRequest } from "../types";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useUpdateOperatorsAvailability() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const token =
    (auth as any)?.accessToken ||
    (auth as any)?.token ||
    (auth as any)?.jwt ||
    null;

  return useMutation({
    /**
     * payload example:
     * { freeIds: number[], busyIds: number[] }
     */
    mutationFn: async (payload: { freeIds: number[]; busyIds: number[] }) => {
      // Appel pour mark-free
      if (payload.freeIds.length > 0) {
        await axios.put(
          `${API_BASE_URL}/api/v1/employees/mark-free`,
          { employeeIds: payload.freeIds } as EmployeeFreeRequest,
          {
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : undefined,
          }
        );
      }

      // Appel pour mark-busy
      if (payload.busyIds.length > 0) {
        await axios.put(
          `${API_BASE_URL}/api/v1/employees/mark-busy`,
          { employeeIds: payload.busyIds } as EmployeeFreeRequest,
          {
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : undefined,
          }
        );
      }

      return true;
    },
    onSuccess: () => {
      // Invalide la query pour refetch les employés après mise à jour
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
