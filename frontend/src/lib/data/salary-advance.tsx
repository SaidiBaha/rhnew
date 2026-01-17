import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";

import useAuth from "@/hooks/useAuth";
import type {
  SalaryAdvance,
  SalaryAdvanceUpdateRequest,
} from "@/modules/salary-advance/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useFetchSalaryAdvances = () => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["salary-advances", auth.user?.id],
    queryFn: () => {
      return axios.get<SalaryAdvance[]>("/salary-advances", {
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    enabled: !!auth.user?.id,
  });
};

export const useBatchUpdateSalaryAdvances = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalaryAdvanceUpdateRequest[]) => {
      return axios.put("/salary-advances/batch-update", data, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-advances"] });
      toast.success("Avances mis à jour avec succès");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Erreur lors de la mise à jour des avances"
      );
    },
  });
};
