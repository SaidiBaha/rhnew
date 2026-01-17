import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Employee } from "./useFetchEmployees";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useFetchSupervisors() {
    const { auth } = useAuth();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useQuery({
        queryKey: ["employees", "supervisors"],
        enabled: !!token,
        queryFn: async () => {
            const res = await axios.get<Employee[]>(
                `${API_BASE_URL}/employees/supervisors`,
                {
                    headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                }
            );
            return res.data;
        },
    });
}
