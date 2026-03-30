import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

export function useDeleteAbsence() {
  const { auth } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/absences/${id}`, {
        baseURL: import.meta.env.VITE_API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absences"] }),
  });
}