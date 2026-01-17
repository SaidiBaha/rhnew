import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export type ProductionLine = {
    id: number;
    name?: string;
    label?: string;
};

export function useFetchProductionLines() {
    const { auth } = useAuth();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useQuery({
        queryKey: ["production-lines"],
        enabled: !!token,
        queryFn: async () => {
            const res = await axios.get<ProductionLine[]>(
                `${API_BASE_URL}/production-lines`,
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
