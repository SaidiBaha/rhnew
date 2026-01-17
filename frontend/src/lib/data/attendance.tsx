import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";

import useAuth from "@/hooks/useAuth";
import type {
  AttendanceRequest,
  EmployeeAttendace,
} from "@/modules/attendance/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useBatchSaveAttendances = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AttendanceRequest[]) => {
      return axios.post("/attendances/batch-save", data, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      toast.success("Pointage mis à jour avec succès");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Erreur lors de la mise à jour du pointage"
      );
    },
  });
};

export const useFetchEmployeeAttendancesForCurrentMonth = () => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["attendances", auth.user?.id],
    queryFn: async () => {
      const { data } = await axios.get<EmployeeAttendace[]>("/attendances", {
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });

      return data;
    },
    enabled: !!auth.user?.id,
  });
};
