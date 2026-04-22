import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useBlockUser() {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, blocked }: { id: number; blocked: boolean }) => {
      const res = await axios.patch(
        `${API_BASE_URL}/admin/users/${id}/block`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { blocked },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-stats"] });
    },
  });
}
