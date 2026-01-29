import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Permutation, PermutationCreatePayload } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useCreatePermutation() {
    const { auth } = useAuth();
    const queryClient = useQueryClient();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useMutation({
        mutationFn: async (payload: PermutationCreatePayload) => {
            const res = await axios.post<Permutation[]>(
                `${API_BASE_URL}/permutations`,
                payload,
                {
                    headers: token
                        ? {
                            Authorization: `Bearer ${token}`,
                        }
                        : undefined,
                }
            );
            return res.data;
        },
        onSuccess: () => {
            // Invalider les queries pour rafraîchir les données
            queryClient.invalidateQueries({ queryKey: ["permutations"] });
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            queryClient.invalidateQueries({ queryKey: ["free-employees"] });
        },
    });
}
