import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { RequestStatus } from "@/modules/request/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type BulkStatusResult = { updated: number; skipped: number };

export function useBulkUpdateRequestStatus() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: RequestStatus }) =>
      axios.patch<BulkStatusResult>(
        "/requests/bulk-status",
        { ids, status },
        {
          baseURL: API_BASE_URL,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}
