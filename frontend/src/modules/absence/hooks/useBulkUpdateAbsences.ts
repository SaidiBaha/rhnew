import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { BulkUpdateInput } from "@/modules/absence/types";

export function useBulkUpdateAbsences() {
  const { auth } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkUpdateInput) => {
      await axios.post("/absences/bulk-update", input, {
        baseURL: import.meta.env.VITE_API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absences"] }),
  });
}
