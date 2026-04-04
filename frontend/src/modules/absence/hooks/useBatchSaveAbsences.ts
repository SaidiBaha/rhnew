import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { SaveAbsenceInput } from "@/modules/absence/types";

export function useBatchSaveAbsences() {
  const { auth } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: SaveAbsenceInput[]): Promise<{ saved: number; received: number }> => {
      const { data } = await axios.post<{ saved: number; received: number }>(
        "/absences/batch-save",
        inputs,
        {
          baseURL: import.meta.env.VITE_API_BASE_URL,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absences"] }),
  });
}
