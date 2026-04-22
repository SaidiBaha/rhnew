import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { UpdateUserRequest } from "@/modules/user-management/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useUpdateUser() {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken ?? null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUserRequest }) => {
      const res = await axios.put(`${API_BASE_URL}/admin/users/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
