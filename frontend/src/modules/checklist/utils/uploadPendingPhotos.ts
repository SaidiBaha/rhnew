import axios from "axios";
import type { QueryClient } from "@tanstack/react-query";
import type { ChecklistInstance } from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * After an instance is saved (create or update), upload any photos queued by the form.
 * Photos are matched to their response by itemId — the saved instance provides the response IDs.
 * Pass the in-memory accessToken from useAuth().
 */
export async function uploadPendingPhotos(
  savedInstance: ChecklistInstance,
  pendingPhotos: Map<number, File[]>,
  queryClient: QueryClient,
  token?: string | null
): Promise<void> {
  if (!pendingPhotos.size || !savedInstance.responses?.length) return;

  const uploads: Promise<void>[] = [];

  for (const response of savedInstance.responses) {
    if (!response.id || response.response !== "NOK") continue;
    const files = pendingPhotos.get(response.itemId);
    if (!files?.length) continue;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      uploads.push(
        axios
          .post(`${API_BASE_URL}/checklist/responses/${response.id}/photos`, formData, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              "Content-Type": "multipart/form-data",
            },
          })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["response-photos", response.id] });
          })
          .catch(() => {})
      );
    }
  }

  await Promise.all(uploads);
  // Invalidate the instance so photoCount refreshes
  queryClient.invalidateQueries({ queryKey: ["checklist-instances", savedInstance.id] });
  queryClient.invalidateQueries({ queryKey: ["checklist-instances"] });
}
