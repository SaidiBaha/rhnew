import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, Camera } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import { useFetchResponsePhotos } from "@/modules/checklist/hooks/useFetchResponsePhotos";
import { useDeleteResponsePhoto } from "@/modules/checklist/hooks/useDeleteResponsePhoto";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function GalleryImage({ photoId, fill = false }: { photoId: number; fill?: boolean }) {
  const { auth } = useAuth();
  const [src, setSrc] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const token = (auth as any)?.accessToken || (auth as any)?.token || null;
    let cancelled = false;
    axios
      .get(`${API_BASE_URL}/checklist/photos/${photoId}`, {
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      .then(({ data }) => {
        if (cancelled) return;
        const url = URL.createObjectURL(data);
        urlRef.current = url;
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [photoId, auth]);

  if (!src) {
    return (
      <div
        className={`${fill ? "w-full h-full" : "w-14 h-14"} animate-pulse rounded-lg`}
        style={{ background: "rgba(255,255,255,0.1)" }}
      />
    );
  }

  return (
    <img
      src={src}
      className={fill ? "max-w-full max-h-full object-contain" : "w-14 h-14 object-cover rounded-lg"}
    />
  );
}

interface Props {
  responseId: number;
  itemLabel: string;
  categoryName: string;
  readOnly?: boolean;
  onClose: () => void;
}

export function PhotoGalleryModal({
  responseId,
  itemLabel,
  categoryName,
  readOnly = true,
  onClose,
}: Props) {
  const { data: photos = [], isLoading } = useFetchResponsePhotos(responseId);
  const deleteMutation = useDeleteResponsePhoto(responseId);
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeIdx = Math.min(currentIndex, Math.max(0, photos.length - 1));
  const currentPhoto = photos[safeIdx];

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, photos.length - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [photos.length, onClose]);

  const handleDelete = () => {
    if (!currentPhoto) return;
    deleteMutation.mutate(currentPhoto.id, {
      onSuccess: () => {
        if (safeIdx >= photos.length - 1 && safeIdx > 0) setCurrentIndex(safeIdx - 1);
      },
      onError: () => toast.error("Erreur lors de la suppression"),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "rgba(0,0,0,0.93)" }}
    >
      {/* ─ Header ─ */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Camera className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} />
            <span className="text-sm font-semibold text-white">{categoryName}</span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>/</span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              {itemLabel}
            </span>
          </div>
          {photos.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {safeIdx + 1} / {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && currentPhoto && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "var(--accent4)" }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ─ Main image ─ */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden px-14 py-4">
        {isLoading ? (
          <p className="text-sm animate-pulse" style={{ color: "rgba(255,255,255,0.4)" }}>
            Chargement des photos…
          </p>
        ) : photos.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Aucune photo disponible
          </p>
        ) : (
          <>
            {safeIdx > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            )}

            <div className="w-full h-full flex items-center justify-center">
              {currentPhoto && <GalleryImage photoId={currentPhoto.id} fill />}
            </div>

            {safeIdx < photos.length - 1 && (
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ─ Thumbnail strip (only if > 1 photo) ─ */}
      {photos.length > 1 && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 shrink-0 overflow-x-auto"
          style={{
            background: "rgba(0,0,0,0.5)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className="shrink-0 rounded-lg overflow-hidden transition-all"
              style={{
                outline: i === safeIdx ? "2px solid var(--accent)" : "2px solid transparent",
                outlineOffset: "2px",
                opacity: i === safeIdx ? 1 : 0.55,
              }}
            >
              <GalleryImage photoId={p.id} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact camera icon + count badge. Renders nothing if count <= 0. */
export function PhotoIndicator({
  count,
  onClick,
}: {
  count: number;
  onClick: (e: React.MouseEvent) => void;
}) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${count} photo${count > 1 ? "s" : ""} — cliquer pour consulter`}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-all hover:opacity-80 shrink-0"
      style={{
        background: "var(--accent-light)",
        color: "var(--accent)",
        border: "1px solid var(--border)",
      }}
    >
      <Camera className="h-3 w-3" />
      {count}
    </button>
  );
}
