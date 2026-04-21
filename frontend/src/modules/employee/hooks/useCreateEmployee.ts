import {useMutation, useQueryClient} from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type {EmployeeRequest} from "@/modules/employee/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000";

export function useCreateEmployee() {
    const {auth} = useAuth();
    const queryClient = useQueryClient();

    const token =
        (auth as any)?.accessToken ||
        (auth as any)?.token ||
        (auth as any)?.jwt ||
        null;

    return useMutation({
        mutationFn: async (employeeData: EmployeeRequest) => {
            const res = await axios.post(
                `${API_BASE_URL}/employees`,
                employeeData,
                {
                    headers: token ? {Authorization: `Bearer ${token}`} : undefined,
                }
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["employees"]});
        },
    });
}