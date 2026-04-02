import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type EmployeeStats = {
    totalEmployees: number;
    currentEmployees: number;
    formerEmployees: number;
};

export function useFetchEmployeesStats() {
    const { auth } = useAuth();

    return useQuery({
        queryKey: ["employees", "stats"],
        queryFn: async () => {
            const { data } = await axios.get<EmployeeStats>("/employees/stats", {
                baseURL: API_BASE_URL,
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`,
                },
            });
            return data;
        },
        enabled: !!auth.user?.id,
        staleTime: 5 * 60 * 1000,
    });
}