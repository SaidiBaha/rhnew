import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export type JobTitleOption = {
    id: number;
    title: string;
};

export function useFetchJobTitles() {
    const { auth } = useAuth();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useQuery({
        queryKey: ["job-titles"],
        enabled: !!token,
        queryFn: async () => {
            const res = await axios.get<JobTitleOption[]>(
                `${API_BASE_URL}/job-titles`,
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
