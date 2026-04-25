import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import type { ManualPresenceInput } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface SaveResult {
  presentCount: number;
  absentCount: number;
  date: string; // "DD/MM/YYYY"
}

/**
 * Mutation pour sauvegarder la saisie manuelle des présences/absences.
 * Invalide les caches today et status après succès.
 */
export const useManualPresenceSave = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      meta,
    }: {
      input: ManualPresenceInput;
      meta: SaveResult;
    }) => {
      await axios.post("/attendances/manual-entry", input, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      return meta;
    },
    onSuccess: (meta) => {
      queryClient.invalidateQueries({ queryKey: ["presence", "today"] });
      queryClient.invalidateQueries({ queryKey: ["presence", "today", "status"] });
      queryClient.invalidateQueries({ queryKey: ["presence-audit-logs"] });
      toast.success(
        `Présences enregistrées pour le ${meta.date}. ${meta.presentCount} présent(s), ${meta.absentCount} absent(s).`,
        { duration: 5000 }
      );
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement des présences");
    },
  });
};
