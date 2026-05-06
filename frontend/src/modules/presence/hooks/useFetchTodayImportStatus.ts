import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { TodayImportStatus } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Retourne le statut d'import du jour pour l'équipe du superviseur connecté.
 * Uniquement activé pour les utilisateurs avec le rôle SUPERVISOR.
 */
export const useFetchTodayImportStatus = () => {
  const { auth } = useAuth();
  const isSupervisor = auth.user?.role === "SUPERVISOR";

  return useQuery({
    queryKey: ["presence", "today", "status"],
    queryFn: async () => {
      const { data } = await axios.get<TodayImportStatus>(
        "/attendances/today/status",
        {
          baseURL: API_BASE_URL,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }
      );
      return data;
    },
    enabled: !!auth.user?.id && isSupervisor,
    // Rafraîchissement automatique toutes les 30s pour rester synchronisé
    // avec un éventuel import admin concurrent
    refetchInterval: 30_000,
  });
};
