// src/modules/dashboard/hooks/useFetchPermutationsDaily.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";
const V1 = `${API_BASE_URL}`;

export type PermutationsDailyRow = {
    date: string;  // "YYYY-MM-DD"
    count: number; // nombre permutations (acceptées) ce jour
};

export function useFetchPermutationsDaily(from: string, to: string) {
    const { auth } = useAuth();
    const token =
        (auth as any)?.accessToken || (auth as any)?.token || (auth as any)?.jwt || null;

    return useQuery({
        queryKey: ["dashboard-permutations-daily", from, to],
        enabled: !!token && !!from && !!to,
        queryFn: async () => {
            const res = await axios.get<PermutationsDailyRow[]>(
                `${V1}/dashboard/permutations-daily`,
                {
                    params: { from, to }, // ou du/au si tu préfères
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }
            );
            return res.data ?? [];
        },
        staleTime: 20_000,
    });
}