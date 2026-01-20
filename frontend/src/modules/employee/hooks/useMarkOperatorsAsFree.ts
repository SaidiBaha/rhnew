import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { EmployeeFreeRequest } from "@/modules/permutation/types";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000/api/v1";

export function useMarkOperatorsAsFree() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const token =
    (auth as any)?.accessToken ||
    (auth as any)?.token ||
    (auth as any)?.jwt ||
    null;

  return useMutation({
    mutationFn: async (payload: EmployeeFreeRequest) => {
      await axios.put(
        `${API_BASE_URL}/employees/mark-free`,
        payload,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-availability"] });
    },
  });
}
