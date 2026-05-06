import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { Notification } from "@/modules/notifications/types";

const BASE = import.meta.env.VITE_API_BASE_URL;

export function useFetchNotifications() {
  const { auth } = useAuth();
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await axios.get(`${BASE}/notifications`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      return res.data;
    },
    refetchInterval: 30_000, // actualiser toutes les 30s
  });
}

export function useFetchUnreadCount() {
  const { auth } = useAuth();
  return useQuery<{ count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const res = await axios.get(`${BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkAllAsRead() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axios.patch(`${BASE}/notifications/mark-all-read`, null, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAsRead() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.patch(`${BASE}/notifications/${id}/mark-read`, null, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}
