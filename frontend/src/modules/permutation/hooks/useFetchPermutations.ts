import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Permutation } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useFetchPermutations(enabled = true) {
    const { auth } = useAuth();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useQuery({
        queryKey: ["permutations"],
        enabled: !!token && enabled,
        queryFn: async () => {
            const res = await axios.get<Permutation[]>(
                `${API_BASE_URL}/permutations`,
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
    });
}
