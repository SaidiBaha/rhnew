import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { SaveAbsenceInput } from "@/modules/absence/types";

export function useBatchSaveAbsences() {
  const { auth } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: SaveAbsenceInput[]) => {
      await axios.post("/absences/batch-save", inputs, {
        baseURL: import.meta.env.VITE_API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absences"] }),
  });
}