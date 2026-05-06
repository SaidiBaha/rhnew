import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";

import useAuth from "@/hooks/useAuth";
import type {
  SalaryAdvanceRequestCreatePayload,
  SalaryAdvanceRequestDashboard,
  SalaryAdvanceRequestRow,
  SalaryAdvanceRequestStatus,
} from "@/modules/salary-advance/request-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function useAuthHeaders() {
  const { auth } = useAuth();

  return {
    auth,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
    },
  };
}

export function useFetchMySalaryAdvanceRequests(enabled = true) {
  const { auth, headers } = useAuthHeaders();

  return useQuery({
    queryKey: ["salary-advance-requests", "mine", auth.user?.id],
    enabled: !!auth.user?.id && enabled,
    queryFn: async () => {
      const { data } = await axios.get<SalaryAdvanceRequestRow[]>(
        "/salary-advance-requests/mine",
        { baseURL: API_BASE_URL, headers }
      );
      return data;
    },
  });
}

export function useFetchAdminSalaryAdvanceRequests(enabled = true) {
  const { auth, headers } = useAuthHeaders();

  return useQuery({
    queryKey: ["salary-advance-requests", "admin", auth.user?.id],
    enabled: !!auth.user?.id && enabled,
    queryFn: async () => {
      const { data } = await axios.get<SalaryAdvanceRequestRow[]>(
        "/salary-advance-requests/admin",
        { baseURL: API_BASE_URL, headers }
      );
      return data;
    },
  });
}

export function useCreateSalaryAdvanceRequest() {
  const { headers } = useAuthHeaders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SalaryAdvanceRequestCreatePayload) => {
      const { data } = await axios.post<SalaryAdvanceRequestRow>(
        "/salary-advance-requests",
        payload,
        { baseURL: API_BASE_URL, headers }
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["salary-advance-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["salary-advance-dashboard"] });
      toast.success("Demande d'avance créée");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Création impossible");
    },
  });
}

export function useUpdateSalaryAdvanceRequestStatus() {
  const { headers } = useAuthHeaders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: SalaryAdvanceRequestStatus }) => {
      const { data } = await axios.put<SalaryAdvanceRequestRow>(
        `/salary-advance-requests/${id}/status`,
        { status },
        { baseURL: API_BASE_URL, headers }
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["salary-advance-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["salary-advance-dashboard"] });
      toast.success("Statut mis à jour");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Mise à jour impossible");
    },
  });
}

export function useFetchSalaryAdvanceDashboard(enabled = true) {
  const { auth, headers } = useAuthHeaders();

  return useQuery({
    queryKey: ["salary-advance-dashboard", auth.user?.id],
    enabled: !!auth.user?.id && enabled,
    queryFn: async () => {
      const { data } = await axios.get<SalaryAdvanceRequestDashboard>(
        "/salary-advance-requests/dashboard",
        { baseURL: API_BASE_URL, headers }
      );
      return data;
    },
  });
}
