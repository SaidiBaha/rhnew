import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export type DepartmentOption = {
    id: number;
    name: string;
};

export function useFetchDepartments() {
    const { auth } = useAuth();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useQuery({
        queryKey: ["departments"],
        enabled: !!token,
        queryFn: async () => {
            const res = await axios.get<DepartmentOption[]>(
                `${API_BASE_URL}/departments`,
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
