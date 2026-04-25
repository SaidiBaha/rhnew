import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { RequestStatus } from "@/modules/request/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useUpdateRequestStatus() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      axios.patch(
        `/requests/${id}/status`,
        { status },
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
