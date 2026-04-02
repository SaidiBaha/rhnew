// src/modules/dashboard/hooks/useFetchProjectHours.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";
const V1 = `${API_BASE_URL}`;

export type ProjectHoursRow = {
    idProjet: number;
    nomProjet: string;

    idSuperviseur: number | null;
    nomSuperviseur: string;
    matriculeSuperviseur?: string | null;

    heuresAjoutees: number;
    heuresTransferees: number;
};

export function useFetchProjectHours(du: string, au: string, enabled = true) {
    const { auth } = useAuth();
    const token =
        (auth as any)?.accessToken || (auth as any)?.token || (auth as any)?.jwt || null;

    return useQuery({
        queryKey: ["dashboard-project-hours", du, au],
        enabled: !!token && !!du && !!au && enabled,
        queryFn: async () => {
            const res = await axios.get<ProjectHoursRow[]>(`${V1}/dashboard/project-hours`, {
                params: { du, au }, // ✅ compatible avec ton controller
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            return res.data;
        },
        staleTime: 20_000,
        retry: false,
    });
}