import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import type { UpdateAttendanceRequest } from "@/modules/presence/types";

export function useUpdateHistoryAttendance() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateAttendanceRequest }) => {
      const { data: res } = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/attendances/${id}`,
        data,
        { headers: { Authorization: `Bearer ${auth.accessToken}` } }
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("Pointage mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });
}
