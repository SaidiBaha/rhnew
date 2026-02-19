import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { EmployeeFreeRequest } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

type Payload = { freeIds: number[]; busyIds: number[] };

export function useUpdateOperatorsAvailability() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const token =
      (auth as any)?.accessToken ||
      (auth as any)?.token ||
      (auth as any)?.jwt ||
      null;

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  return useMutation({
    mutationFn: async (payload: Payload) => {
      const tasks: Promise<any>[] = [];

      if (payload.freeIds?.length > 0) {
        tasks.push(
            axios.put(
                `${API_BASE_URL}/api/v1/employees/mark-free`,
                { employeeIds: payload.freeIds } as EmployeeFreeRequest,
                { headers }
            )
        );
      }

      if (payload.busyIds?.length > 0) {
        tasks.push(
            axios.put(
                `${API_BASE_URL}/api/v1/employees/mark-busy`,
                { employeeIds: payload.busyIds } as EmployeeFreeRequest,
                { headers }
            )
        );
      }

      if (tasks.length === 0) return true;

      await Promise.all(tasks);
      return true;
    },

    onSuccess: async () => {
      // ✅ Employees list (global)
      await queryClient.invalidateQueries({ queryKey: ["employees"] });

      // ✅ Pool des libres (RECEVOIR)
      await queryClient.invalidateQueries({ queryKey: ["free-employees"] });

      // ✅ Permutations (recalcul overlap / stats)
      await queryClient.invalidateQueries({ queryKey: ["permutations"] });
    },
  });
}
