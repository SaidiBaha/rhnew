import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import type { ChecklistResponsePhotoMeta } from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useFetchResponsePhotos(responseId: number | undefined) {
  const { auth } = useAuth();
  const token = (auth as any)?.accessToken || (auth as any)?.token || null;

  return useQuery({
    queryKey: ["response-photos", responseId],
    queryFn: async () => {
      const { data } = await axios.get<ChecklistResponsePhotoMeta[]>(
        `${API_BASE_URL}/checklist/responses/${responseId}/photos`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      return data;
    },
    enabled: !!responseId,
  });
}
