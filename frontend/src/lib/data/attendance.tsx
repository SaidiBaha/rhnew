import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";

import useAuth from "@/hooks/useAuth";
import type {
  AttendanceRequest,
  EmployeeAttendace,
  TodayAttendance,
  AbsenceRow,
} from "@/modules/attendance/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Batch save (import Excel) ─────────────────────────────────────────────
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
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["attendances", "today"] });
      toast.success("Pointage mis à jour avec succès");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Erreur lors de la mise à jour du pointage"
      );
    },
  });
};

// ─── Monthly summary ───────────────────────────────────────────────────────
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

// ─── Today attendance (cards view) ────────────────────────────────────────
export const useFetchTodayAttendance = () => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["attendances", "today"],
    queryFn: async () => {
      const { data } = await axios.get<TodayAttendance[]>(
        "/attendances/today",
        {
          baseURL: API_BASE_URL,
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );
      return data;
    },
    enabled: !!auth.user?.id,
    refetchInterval: 2 * 60 * 1000,
  });
};

// ─── Absences table ────────────────────────────────────────────────────────
export const useFetchAbsences = (params: {
  from?: string;
  to?: string;
  status?: string;
  supervisorMatricule?: string;
}) => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["absences", params],
    queryFn: async () => {
      const { data } = await axios.get<AbsenceRow[]>(
        "/attendances/absences",
        {
          baseURL: API_BASE_URL,
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          params: {
            from: params.from || undefined,
            to: params.to || undefined,
            status: params.status || undefined,
            supervisorMatricule: params.supervisorMatricule || undefined,
          },
        }
      );
      return data;
    },
    enabled: !!auth.user?.id,
  });
};

// ─── Update attendance (edit modal) ───────────────────────────────────────
export const useUpdateAttendance = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      id: number;
      status?: string;
      absenceReason?: string;
      date?: string;
    }) => {
      return axios.put(`/attendances/${payload.id}`, payload, {
        baseURL: API_BASE_URL,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["attendances", "today"] });
      toast.success("Pointage mis à jour ✅");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });
};

// ─── Delete attendance ─────────────────────────────────────────────────────
export const useDeleteAttendance = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => {
      return axios.delete(`/attendances/${id}`, {
        baseURL: API_BASE_URL,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Supprimé ✅");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });
};