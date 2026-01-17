import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Permutation } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

type Action = "accept" | "refuse";

export function useUpdatePermutationStatus() {
    const { auth } = useAuth();
    const queryClient = useQueryClient();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useMutation({
        mutationFn: async ({ id, action }: { id: number; action: Action }) => {
            const res = await axios.post<Permutation>(
                `${API_BASE_URL}/permutations/${id}/${action}`,
                null,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["permutations"] });
        },
    });
}
