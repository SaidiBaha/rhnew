// src/modules/employee/hooks/useFetchSupervisors.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

export type Supervisor = {
    id: number;
    fullName: string;
    matricule: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useFetchSupervisors() {
    const { auth } = useAuth();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useQuery({
        queryKey: ["supervisors"],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE_URL}/api/v1/employees/supervisors`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            return res.data as Supervisor[];
        },
        staleTime: 60_000,
    });
}
