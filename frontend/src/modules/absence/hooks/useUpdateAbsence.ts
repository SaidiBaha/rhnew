import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { UpdateAbsenceInput } from "@/modules/absence/types";

export function useUpdateAbsence() {
  const { auth } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: UpdateAbsenceInput }) => {
      const { data } = await axios.put(`/absences/${id}`, dto, {
        baseURL: import.meta.env.VITE_API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absences"] }),
  });
}