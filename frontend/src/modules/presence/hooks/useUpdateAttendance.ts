import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import type { UpdateAttendanceRequest } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useUpdateAttendance = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAttendanceRequest }) =>
      axios.put(`/attendances/${id}`, data, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presence", "today"] });
      queryClient.invalidateQueries({ queryKey: ["presence-audit-logs"] });
      toast.success("Pointage mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });
};
