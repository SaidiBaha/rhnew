import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { SupervisorTrackingStats } from "@/modules/salary-advance/types";

const BASE = import.meta.env.VITE_API_BASE_URL;

export function useFetchSupervisorTracking() {
  const { auth } = useAuth();
  return useQuery<SupervisorTrackingStats>({
    queryKey: ["supervisor-advance-tracking"],
    queryFn: async () => {
      const res = await axios.get(`${BASE}/supervisor-advance-tracking`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      return res.data;
    },
  });
}

export function useSendReminder() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trackingId: string) => {
      await axios.post(
        `${BASE}/supervisor-advance-tracking/${trackingId}/remind`,
        null,
        { headers: { Authorization: `Bearer ${auth.accessToken}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-advance-tracking"] });
    },
  });
}
