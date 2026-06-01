import { useEffect, useRef, useState } from "react";
import { Camera, Paperclip, Trash2, ZoomIn, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import useAuth from "@/hooks/useAuth";
import { useFetchResponsePhotos } from "@/modules/checklist/hooks/useFetchResponsePhotos";
import { useDeleteResponsePhoto } from "@/modules/checklist/hooks/useDeleteResponsePhoto";
import type { ChecklistResponsePhotoMeta } from "@/modules/checklist/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL = 5;

const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

interface Props {
  itemId: number;
  responseId?: number;
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemovePending: (index: number) => void;
}

/** Fetches one image binary with auth headers and returns a blob URL (auto-revoked on unmount). */
function AuthImage({ photoId, alt }: { photoId: number; alt?: string }) {
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

  if (!src)
    return (
      <div
        className="w-16 h-16 rounded-lg animate-pulse"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      />
    );

  return (
    <img src={src} alt={alt ?? "photo"} className="w-16 h-16 object-cover rounded-lg" />
  );
}

/** Thumbnail for a file queued but not yet uploaded (create mode / new adds). */
function PendingThumb({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative inline-block group">
      {src ? (
        <img src={src} className="w-16 h-16 object-cover rounded-lg opacity-80" />
      ) : (
        <div
          className="w-16 h-16 rounded-lg animate-pulse"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        />
      )}
      <span
        className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full text-white text-xs font-bold"
        style={{ background: "var(--accent3)", fontSize: 9 }}
        title="En attente d'enregistrement"
      >
        ●
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(240,62,62,0.7)" }}
        title="Retirer"
      >
        <X className="h-4 w-4 text-white" />
      </button>
    </div>
  );
}

/** Lightbox overlay for full-screen photo view. */
function Lightbox({ photoId, onClose }: { photoId: number; onClose: () => void }) {
  const { auth } = useAuth();
  const [src, setSrc] = useState<string | null>(null);

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
        setSrc(URL.createObjectURL(data));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [photoId, auth]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      {src ? (
        <img
          src={src}
          className="max-w-full max-h-full rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="text-white text-sm animate-pulse">Chargement…</div>
      )}
      <button
        className="absolute top-4 right-4 rounded-full p-2 bg-white/20 hover:bg-white/40 text-white"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Desktop webcam capture modal — opens getUserMedia stream, lets user capture a frame,
 * converts it to a JPEG File and calls onCapture. Stops the stream on unmount.
 */
function CameraModal({
  stream,
  onCapture,
  onClose,
}: {
  stream: MediaStream;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    return () => {
      stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        stream.getTracks().forEach((t) => t.stop());
        onCapture(file);
      },
      "image/jpeg",
      0.85
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div
        className="rounded-2xl shadow-2xl overflow-hidden w-full"
        style={{ background: "var(--white)", border: "1px solid var(--border)", maxWidth: 640 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Prendre une photo
            </span>
          </div>
          <button type="button" onClick={onClose} style={{ color: "var(--muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video stream */}
        <div className="bg-black flex items-center justify-center" style={{ minHeight: 280 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full block"
            style={{ maxHeight: 480 }}
          />
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleCapture}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            Capturer
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResponsePhotoUploader({
  itemId: _itemId,
  responseId,
  pendingFiles,
  onAddFiles,
  onRemovePending,
}: Props) {
  const { data: existingPhotos = [] } = useFetchResponsePhotos(responseId);
  const deleteMutation = useDeleteResponsePhoto(responseId);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [lightboxId, setLightboxId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const totalCount = existingPhotos.length + pendingFiles.length;
  const remaining = MAX_TOTAL - totalCount;

  const validateAndAdd = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: File[] = [];
    for (const f of arr) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error(`${f.name} : type non supporté (JPEG, PNG, WebP uniquement)`);
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        toast.error(`${f.name} : taille max 5 Mo`);
        continue;
      }
      valid.push(f);
    }
    const toAdd = valid.slice(0, remaining);
    if (toAdd.length > 0) onAddFiles(toAdd);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCameraClick = async () => {
    if (isMobile) {
      cameraInputRef.current?.click();
      return;
    }

    // Desktop: use getUserMedia — fallback to file picker if API unavailable
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        toast.error("Accès à la caméra refusé. Autorisez l'accès dans les paramètres du navigateur.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        toast.error("Aucune caméra disponible sur cet appareil.");
      } else {
        toast.error("Impossible d'accéder à la caméra. Utilisez \"Uploader une photo\" à la place.");
      }
    }
  };

  const handleDelete = (photo: ChecklistResponsePhotoMeta) => {
    deleteMutation.mutate(photo.id, {
      onError: () => toast.error("Erreur lors de la suppression"),
    });
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Thumbnails row */}
      {(existingPhotos.length > 0 || pendingFiles.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="relative inline-block group">
              <AuthImage photoId={photo.id} alt={photo.fileName} />
              {/* Zoom button */}
              <button
                type="button"
                onClick={() => setLightboxId(photo.id)}
                className="absolute bottom-0 left-0 flex items-center justify-center w-6 h-6 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(47,107,255,0.85)" }}
                title="Voir en grand"
              >
                <ZoomIn className="h-3.5 w-3.5 text-white" />
              </button>
              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(photo)}
                disabled={deleteMutation.isPending}
                className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(240,62,62,0.85)" }}
                title="Supprimer"
              >
                <Trash2 className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}

          {pendingFiles.map((file, i) => (
            <PendingThumb key={i} file={file} onRemove={() => onRemovePending(i)} />
          ))}
        </div>
      )}

      {/* Upload + camera buttons */}
      {remaining > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Drag-drop / file picker */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              validateAndAdd(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs cursor-pointer transition-all select-none"
            style={{
              border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
              background: dragOver ? "var(--accent-light)" : "transparent",
              color: dragOver ? "var(--accent)" : "var(--muted)",
            }}
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span>
              Uploader une photo{" "}
              <span
                className="font-semibold"
                style={{ color: totalCount >= MAX_TOTAL - 1 ? "var(--accent4)" : "inherit" }}
              >
                ({totalCount}/{MAX_TOTAL})
              </span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && validateAndAdd(e.target.files)}
            />
          </div>

          {/* Camera capture button */}
          <button
            type="button"
            onClick={handleCameraClick}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs cursor-pointer transition-all select-none font-medium"
            style={{
              border: "1.5px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
            }}
            title="Ouvrir la caméra"
          >
            <Camera className="h-3.5 w-3.5 shrink-0" />
            <span>Prendre une photo</span>
          </button>

          {/* Mobile-only hidden input with capture attribute */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files && validateAndAdd(e.target.files)}
          />
        </div>
      )}

      {remaining === 0 && (
        <p className="text-xs" style={{ color: "var(--accent3)" }}>
          Maximum atteint (5/5 photos)
        </p>
      )}

      {lightboxId !== null && (
        <Lightbox photoId={lightboxId} onClose={() => setLightboxId(null)} />
      )}

      {/* Desktop webcam capture modal */}
      {cameraStream && (
        <CameraModal
          stream={cameraStream}
          onCapture={(file) => {
            setCameraStream(null);
            validateAndAdd([file]);
          }}
          onClose={() => setCameraStream(null)}
        />
      )}
    </div>
  );
}
