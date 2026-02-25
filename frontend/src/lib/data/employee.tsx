// src/lib/data/employee.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";

import useAuth from "@/hooks/useAuth";
import type { Employee, EmployeeRequest } from "@/modules/employee/types";
import { isEmpty } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useFetchEmployees = (page: number = 0) => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["employees", auth.user?.id, page],
    queryFn: async () => {
      const { data } = await axios.get("/employees", {
        baseURL: API_BASE_URL,
        params: { page, size: 25 },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
      return data;
    },
    enabled: !!auth.user?.id,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSearchEmployees = (query: string, page: number = 0) => {
  const { auth } = useAuth();

  return useQuery({
    queryKey: ["employees-search", auth.user?.id, query, page],
    queryFn: async () => {
      const { data } = await axios.get("/employees/search", {
        baseURL: API_BASE_URL,
        params: { query, page, size: 25 },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
      return data;
    },
    enabled: !!auth.user?.id && query.length > 0,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateEmployee = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeRequest) => {
      if (isEmpty(data.supervisor)) {
        delete data.supervisor;
      }

      return axios.post<Employee>("/employees", data, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employé créé avec succès !");
    },
    onError: (error) => {
      toast.error(error?.message || "Erreur lors de la création de l'employé");
    },
  });
};

export const useBatchSaveEmployees = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeRequest[]) => {
      return axios.post("/employees/batch-save", data, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employés mis à jour avec succès");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Erreur lors de la mise à jour des employés"
      );
    },
  });
};

export const useUpdateEmployee = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: EmployeeRequest;
    }) => {
      if (isEmpty(data.supervisor)) {
        delete data.supervisor;
      }

      return axios.put<Employee>(`/employees/${id}`, data, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employé mis à jour avec succès !");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Erreur lors de la mise à jour de l'employé"
      );
    },
  });
};

export const useDeleteEmployee = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return axios.delete(`/employees/${id}`, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employé supprimé avec succès !");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Erreur lors de la suppression de l'employé"
      );
    },
  });
};