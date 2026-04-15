import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import type { DailyAttendance } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Bascule le statut "appelé" d'un enregistrement de présence.
 * Accessible uniquement au rôle NURSE (contrôlé côté backend).
 *
 * Mise à jour optimiste : l'indicateur change immédiatement.
 * En cas d'erreur API : rollback visuel + toast.
 */
export function useToggleAppele() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, appele }: { id: number; appele: boolean }) => {
      const { data } = await axios.patch<DailyAttendance>(
        `/attendances/${id}/appele`,
        { appele },
        {
          baseURL: API_BASE_URL,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }
      );
      return data;
    },

    onMutate: async ({ id, appele }) => {
      // Annule les requêtes en cours pour éviter un écrasement
      await queryClient.cancelQueries({ queryKey: ["presence", "today"] });

      // Sauvegarde de l'état précédent pour rollback
      const previous = queryClient.getQueryData<DailyAttendance[]>(["presence", "today"]);

      // Mise à jour optimiste
      queryClient.setQueryData<DailyAttendance[]>(["presence", "today"], (old) =>
        old?.map((r) =>
          r.id === id
            ? {
                ...r,
                appele,
                appeleAt: appele
                  ? new Date().toLocaleTimeString("fr-TN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Africa/Tunis",
                    })
                  : null,
                appeleBy: appele ? (auth.user?.id ?? null) : null,
              }
            : r
        )
      );

      return { previous };
    },

    onError: (_err, _variables, context) => {
      // Rollback visuel en cas d'erreur
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["presence", "today"], context.previous);
      }
      toast.error("Erreur lors de la mise à jour du statut appelé.");
    },

    onSettled: () => {
      // Re-synchronise avec le serveur après succès ou erreur
      queryClient.invalidateQueries({ queryKey: ["presence", "today"] });
    },
  });
}
