// src/modules/employee/hooks/useFetchEligibleOperators.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9000/api/v1";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type EligibleOperator = {
  id: number;
  fullName: string;
  matricule: string;
  free: boolean;
};

/**
 * Retourne les opérateurs du superviseur connecté qui n'ont aucune permutation
 * ACCEPTEE chevauchant le créneau startTime→endTime aujourd'hui.
 *
 * Endpoint : GET /api/v1/free-operators/eligible?day=...&startTime=...&endTime=...
 *
 * Pour un shift de nuit (ex: 22:00→06:00), endTime est ramené à "23:59"
 * car l'API exige endTime > startTime.
 */
export function useFetchEligibleOperators(startTime: string, endTime: string) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  const today = todayIso();
  const timesReady = !!startTime && !!endTime;

  // Shift de nuit : l'API exige endTime > startTime — on tronque à 23:59
  const effectiveEndTime = timesReady && endTime <= startTime ? "23:59" : endTime;

  return useQuery<EligibleOperator[]>({
    queryKey: ["eligible-operators", today, startTime, endTime],
    enabled: !!token && timesReady,
    queryFn: async () => {
      const res = await axios.get<EligibleOperator[]>(
        `${API_BASE_URL}/free-operators/eligible`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { day: today, startTime, endTime: effectiveEndTime },
        }
      );
      return res.data ?? [];
    },
  });
}
