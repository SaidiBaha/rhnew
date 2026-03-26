import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import type z from "zod";

import useAuth from "@/hooks/useAuth";
import type { Request } from "@/modules/request/types";
import type { RequestSchema } from "@/modules/request/schema";
import { isEmpty } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useFetchRequests = () => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["requests", auth.user?.id],
    queryFn: () => {
      return axios.get<Request[]>("/requests", {
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

export const useFetchRequest = (id: string) => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["request", id, auth.user?.id],
    queryFn: async () => {
      if (isEmpty(id)) {
        return null;
      }

      const { data } = await axios.get<Request>(`/requests/${id}`, {
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });

      return data;
    },
    enabled: !!id && !!auth.user?.id,
  });
};

export const useCreateRequest = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: z.infer<typeof RequestSchema>) => {
      return axios.post<Request>("/requests", data, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Demande créé avec succès !");
    },
    onError: (error) => {
      toast.error(error?.message || "Erreur lors de la création de la demande");
    },
  });
};

export const useUpdateRequest = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: z.infer<typeof RequestSchema>;
    }) => {
      return axios.put<Request>(`/requests/${id}`, data, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Demande mis à jour avec succès !");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Erreur lors de la mise à jour de la demande"
      );
    },
  });
};

export const useCloseRequest = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return axios.patch(`/requests/${id}/close`, null, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Demande clôturée !");
    },
    onError: (error) => {
      toast.error(error?.message || "Erreur lors de la clôture de la demande");
    },
  });
};
export const useDeleteRequest = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return axios.delete(`/requests/${id}`, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Demande supprimée !");
    },
    onError: (error) => {
      toast.error(error?.message || "Erreur lors de la suppression de la demande");
    },
  });
};