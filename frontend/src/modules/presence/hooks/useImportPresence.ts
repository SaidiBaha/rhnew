import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import type { AttendanceRequest } from "@/modules/attendance/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Wrapper autour de /attendances/batch-save.
 * Invalide à la fois ["attendances"] et ["presence","today"] au succès.
 */
export const useImportPresence = () => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (records: AttendanceRequest[]) =>
      axios.post("/attendances/batch-save", records, {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      queryClient.invalidateQueries({ queryKey: ["presence", "today"] });
      toast.success(
        `Import réussi — ${variables.length} enregistrement(s) traité(s)`,
        { duration: 4000, icon: "✅" }
      );
    },
    onError: () => {
      toast.error("Erreur lors de l'import du fichier");
    },
  });
};
