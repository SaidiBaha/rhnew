import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import useAuth from "@/hooks/useAuth";
import type { Employee, PageResponse } from "@/modules/employee/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useFetchEmployeesForFilters() {
    const { auth } = useAuth();

    return useQuery({
        queryKey: ["employees", "all-for-filters"],
        queryFn: async () => {
            const { data } = await axios.get<PageResponse<Employee>>("/employees", {
                baseURL: API_BASE_URL,
                headers: { Authorization: `Bearer ${auth.accessToken}` },
                params: { page: 0, size: 10000 },
            });
            return data.content ?? [];
        },
        enabled: !!auth.user?.id,
        staleTime: 5 * 60 * 1000,
    });
}