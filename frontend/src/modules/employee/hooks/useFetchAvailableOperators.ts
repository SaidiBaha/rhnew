// src/modules/employee/hooks/useFetchAvailableOperators.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth.ts";
import type { Employee } from "./useFetchEmployees";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useFetchAvailableOperators(startDate?: string, endDate?: string) {
    const { auth } = useAuth();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    const enabled = !!startDate && !!endDate;

    return useQuery({
        queryKey: ["available-operators", startDate, endDate],
        enabled,
        queryFn: async () => {
            const res = await axios.get<Employee[]>(
                `${API_BASE_URL}/employees/available`,
                {
                    params: { startDate, endDate },
                    headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                }
            );
            return res.data;
        },
    });
}
