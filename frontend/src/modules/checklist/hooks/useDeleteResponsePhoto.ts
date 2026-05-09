import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useDeleteResponsePhoto(responseId: number | undefined) {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useMutation({
    mutationFn: async (photoId: number) => {
      await axios.delete(`${API_BASE_URL}/checklist/photos/${photoId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    },
    onSuccess: () => {
      if (responseId) {
        queryClient.invalidateQueries({ queryKey: ["response-photos", responseId] });
      }
    },
  });
}
