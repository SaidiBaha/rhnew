import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import useAuth from "@/hooks/useAuth";
import type { SalaryAdvanceDeadline } from "@/modules/salary-advance/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useFetchSalaryAdvanceDeadline = () => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["salary-advance-deadline", auth.user?.id],
    queryFn: async () => {
      try {
        const { data } = await axios.get<SalaryAdvanceDeadline>(
          "/salary-advance-deadlines",
          {
            baseURL: API_BASE_URL,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.accessToken}`,
            },
          }
        );
        return data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!auth.user?.id,
  });
};

export const useCreateSalaryAdvanceDeadline = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      return axios.post("/salary-advance-deadlines", null, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-advance-deadline"] });
    },
  });
};

export const useDeleteSalaryAdvanceDeadline = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      return axios.delete(`/salary-advance-deadlines`, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-advance-deadline"] });
    },
  });
};
