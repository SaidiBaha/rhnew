import { useCallback, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import type {
  ChecklistTemplate,
  ChecklistInstance,
  SaveInstanceRequest,
  ResponseType,
  ChecklistAssignmentDto,
} from "@/modules/checklist/types";
import { ResponsePhotoUploader } from "./ResponsePhotoUploader";
import { PhotoGalleryModal, PhotoIndicator } from "./PhotoGalleryModal";

export type ChecklistPrefill = {
  date?: string;
  lineUnit?: string;
  auditor?: string;
  auditorVisa?: string;
};

interface Props {
  template: ChecklistTemplate;
  initial?: ChecklistInstance;
  prefill?: ChecklistPrefill;
  onSave: (data: SaveInstanceRequest, pendingPhotos: Map<number, File[]>) => void;
  onClose: () => void;
  loading: boolean;
  /** Quand true, bloque la soumission si Chef d'équipe / Responsable / points sont incomplets */
  enforceValidation?: boolean;
}

export function ChecklistFillForm({ template, initial, prefill, onSave, onClose, loading, enforceValidation }: Props) {
  const [date, setDate] = useState(initial?.date ?? prefill?.date ?? new Date().toISOString().split("T")[0]);
  const [lineUnit, setLineUnit] = useState(initial?.lineUnit ?? prefill?.lineUnit ?? "");
  const [teamLeader, setTeamLeader] = useState(initial?.teamLeader ?? "");
  const [auditor, setAuditor] = useState(initial?.auditor ?? prefill?.auditor ?? "");
  const [auditorVisa, setAuditorVisa] = useState(initial?.auditorVisa ?? prefill?.auditorVisa ?? "");
  const [lineResponsible, setLineResponsible] = useState(initial?.lineResponsible ?? "");

  // ── Validation errors ──────────────────────────────────────────────────────
  const [teamLeaderError, setTeamLeaderError] = useState<string | undefined>();
  const [lineResponsibleError, setLineResponsibleError] = useState<string | undefined>();
  const [unansweredItemIds, setUnansweredItemIds] = useState<Set<number>>(new Set());
  const [nokMissingDescIds, setNokMissingDescIds] = useState<Set<number>>(new Set());
  const [hasGlobalPointsError, setHasGlobalPointsError] = useState(false);

  // ── Refs for scroll-to-first-error ────────────────────────────────────────
  const teamLeaderRef = useRef<HTMLInputElement>(null);
  const lineResponsibleRef = useRef<HTMLInputElement>(null);
  const itemErrRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  type ResponseMap = Record<number, { response?: ResponseType; ecartDescription?: string }>;
  const [responses, setResponses] = useState<ResponseMap>(() => {
    const map: ResponseMap = {};
    if (initial?.responses) {
      initial.responses.forEach((r) => {
        map[r.itemId] = { response: r.response, ecartDescription: r.ecartDescription };
      });
    }
    return map;
  });

  const [assignments, setAssignments] = useState<ChecklistAssignmentDto[]>(
    initial?.assignments ?? []
  );

  // Pending photos per itemId (queued, uploaded after instance save)
  const [pendingPhotos, setPendingPhotos] = useState<Map<number, File[]>>(new Map());

  type GalleryData = { responseId: number; itemLabel: string; categoryName: string };
  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);

  // Build a lookup: itemId → responseId (only in edit mode where initial.responses has IDs)
  const responseIdByItemId = useCallback((): Map<number, number> => {
    const map = new Map<number, number>();
    if (initial?.responses) {
      initial.responses.forEach((r) => {
        if (r.id) map.set(r.itemId, r.id);
      });
    }
    return map;
  }, [initial?.responses]);

  const getExistingPhotoCount = (itemId: number): number =>
    initial?.responses?.find((r) => r.itemId === itemId)?.photoCount ?? 0;

  const setResponse = async (
    itemId: number,
    field: "response" | "ecartDescription",
    value: string
  ) => {
    if (field === "response") {
      const current = responses[itemId]?.response;
      const next = (value as ResponseType) || undefined;

      // Warn if switching away from NOK while photos exist
      if (current === "NOK" && next !== "NOK") {
        const existingCount = getExistingPhotoCount(itemId);
        const pendingCount = pendingPhotos.get(itemId)?.length ?? 0;
        const total = existingCount + pendingCount;

        if (total > 0) {
          const result = await Swal.fire({
            title: "Photos associées",
            text: `Ce point a ${total} photo(s). Changer la réponse supprimera ces photos.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Changer quand même",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#f03e3e",
          });
          if (!result.isConfirmed) return;

          // Clear pending photos for this item
          setPendingPhotos((prev) => {
            const next = new Map(prev);
            next.delete(itemId);
            return next;
          });
        }
      }

      setResponses((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], response: next },
      }));

      // Clear unanswered error for this item (real-time)
      setUnansweredItemIds((prev) => {
        if (!prev.has(itemId)) return prev;
        const updated = new Set(prev);
        updated.delete(itemId);
        if (updated.size === 0) setHasGlobalPointsError(false);
        return updated;
      });

      // Clear NOK-missing-description error if switching away from NOK
      if (next !== "NOK") {
        setNokMissingDescIds((prev) => {
          if (!prev.has(itemId)) return prev;
          const updated = new Set(prev);
          updated.delete(itemId);
          return updated;
        });
      }
      return;
    }

    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value || undefined },
    }));

    // Clear NOK-missing-description error when user types a description (real-time)
    if (field === "ecartDescription" && value.trim()) {
      setNokMissingDescIds((prev) => {
        if (!prev.has(itemId)) return prev;
        const updated = new Set(prev);
        updated.delete(itemId);
        return updated;
      });
    }
  };

  const addAssignment = () =>
    setAssignments((prev) => [...prev, { action: "", responsable: "", delai: "", dateRealisation: "" }]);
  const removeAssignment = (i: number) => setAssignments((prev) => prev.filter((_, j) => j !== i));
  const updateAssignment = (i: number, key: keyof ChecklistAssignmentDto, val: string) =>
    setAssignments((prev) => prev.map((a, j) => (j === i ? { ...a, [key]: val || undefined } : a)));

  const handleAddFiles = (itemId: number, files: File[]) => {
    setPendingPhotos((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId) ?? [];
      next.set(itemId, [...existing, ...files]);
      return next;
    });
  };

  const handleRemovePending = (itemId: number, index: number) => {
    setPendingPhotos((prev) => {
      const next = new Map(prev);
      const arr = (next.get(itemId) ?? []).filter((_, i) => i !== index);
      if (arr.length === 0) next.delete(itemId);
      else next.set(itemId, arr);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (enforceValidation) {
      // 1. Chef d'équipe
      const tlError = !teamLeader.trim()
        ? "Le champ Chef d'équipe est obligatoire."
        : undefined;
      setTeamLeaderError(tlError);

      // 2. Responsable ligne/unité
      const lrError = !lineResponsible.trim()
        ? "Le champ Responsable Ligne/Unité est obligatoire."
        : undefined;
      setLineResponsibleError(lrError);

      // 3. Tous les points doivent avoir une réponse
      const allItems = template.categories.flatMap((c) => c.items);
      const unanswered = new Set<number>(
        allItems.filter((item) => !responses[item.id]?.response).map((item) => item.id)
      );
      setUnansweredItemIds(unanswered);
      setHasGlobalPointsError(unanswered.size > 0);

      // 4. Les points N'OK doivent avoir une description d'écart
      const nokMissing = new Set<number>(
        allItems
          .filter(
            (item) =>
              responses[item.id]?.response === "NOK" &&
              !responses[item.id]?.ecartDescription?.trim()
          )
          .map((item) => item.id)
      );
      setNokMissingDescIds(nokMissing);

      const hasErrors = tlError || lrError || unanswered.size > 0 || nokMissing.size > 0;

      if (hasErrors) {
        // Scroll vers la première erreur
        setTimeout(() => {
          if (tlError && teamLeaderRef.current) {
            teamLeaderRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (lrError && lineResponsibleRef.current) {
            lineResponsibleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            const firstErrorId = allItems.find(
              (item) => unanswered.has(item.id) || nokMissing.has(item.id)
            )?.id;
            if (firstErrorId !== undefined) {
              itemErrRefs.current.get(firstErrorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        }, 50);
        return;
      }
    }

    const allItems = template.categories.flatMap((c) => c.items);
    onSave(
      {
        templateId: template.id,
        date: date || undefined,
        lineUnit: lineUnit || undefined,
        teamLeader: teamLeader || undefined,
        auditor: auditor || undefined,
        auditorVisa: auditorVisa || undefined,
        lineResponsible: lineResponsible || undefined,
        status: "COMPLETE",
        responses: allItems.map((item) => ({
          itemId: item.id,
          response: responses[item.id]?.response,
          ecartDescription: responses[item.id]?.ecartDescription,
        })),
        assignments: assignments.map((a) => ({
          action: a.action,
          responsable: a.responsable,
          delai: a.delai || undefined,
          dateRealisation: a.dateRealisation || undefined,
        })),
      },
      pendingPhotos
    );
  };

  const responseIdMap = responseIdByItemId();

  // Field descriptors for the "Informations générales" grid
  type FieldDesc = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type: string;
    readOnly: boolean;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    error?: string;
  };

  const fields: FieldDesc[] = [
    {
      label: "Date",
      value: date,
      onChange: setDate,
      type: "date",
      readOnly: !initial && !!prefill?.date,
    },
    {
      label: "Ligne / Unité",
      value: lineUnit,
      onChange: setLineUnit,
      type: "text",
      readOnly: !initial && !!prefill?.lineUnit,
    },
    {
      label: "Chef d'équipe",
      value: teamLeader,
      onChange: (v) => {
        setTeamLeader(v);
        if (v.trim()) setTeamLeaderError(undefined);
      },
      type: "text",
      readOnly: false,
      inputRef: teamLeaderRef,
      error: teamLeaderError,
    },
    {
      label: "Auditeur",
      value: auditor,
      onChange: setAuditor,
      type: "text",
      readOnly: !initial && !!prefill?.auditor,
    },
    {
      label: "Visa auditeur",
      value: auditorVisa,
      onChange: setAuditorVisa,
      type: "text",
      readOnly: !initial && !!prefill?.auditorVisa,
    },
    {
      label: "Responsable ligne/unité",
      value: lineResponsible,
      onChange: (v) => {
        setLineResponsible(v);
        if (v.trim()) setLineResponsibleError(undefined);
      },
      type: "text",
      readOnly: false,
      inputRef: lineResponsibleRef,
      error: lineResponsibleError,
    },
  ];

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
      <div
        className="w-full max-w-3xl lg:max-w-4xl rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--white)", border: "1px solid var(--border)", maxHeight: "96vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: "var(--text)" }}>
              {initial ? "Modifier la checklist" : "Remplir la checklist"}
            </h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>{template.title}</p>
          </div>
          <button onClick={onClose} className="shrink-0" style={{ color: "var(--muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-5 sm:space-y-6">

            {/* En-tête */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>Informations générales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map(({ label, value, onChange, type, readOnly, inputRef, error }) => (
                  <div key={label}>
                    <label className="mb-1 flex items-center gap-1 text-xs font-medium" style={{ color: "var(--text2)" }}>
                      {label}
                      {readOnly && (
                        <span className="rounded px-1 py-0.5 text-xs font-normal" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                          pré-rempli
                        </span>
                      )}
                    </label>
                    <input
                      ref={inputRef ?? null}
                      type={type}
                      value={value}
                      onChange={(e) => !readOnly && onChange(e.target.value)}
                      readOnly={readOnly}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        border: `1px solid ${error ? "#fca5a5" : "var(--border)"}`,
                        color: "var(--text)",
                        background: "var(--bg)",
                        opacity: readOnly ? 0.75 : 1,
                        cursor: readOnly ? "not-allowed" : "text",
                      }}
                    />
                    {error && (
                      <p className="mt-1 text-xs" style={{ color: "var(--accent4)" }}>{error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Points à vérifier */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>Points à vérifier</h3>

              {/* Bannière d'erreur globale */}
              {hasGlobalPointsError && (
                <div
                  className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                  style={{
                    background: "rgba(240,62,62,0.08)",
                    color: "var(--accent4)",
                    border: "1px solid rgba(240,62,62,0.25)",
                  }}
                >
                  Veuillez répondre à tous les points avant de valider.
                </div>
              )}

              <div className="space-y-4">
                {template.categories.map((cat) => (
                  <div key={cat.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="px-4 py-2.5" style={{ background: "var(--accent)", color: "#fff" }}>
                      <span className="text-sm font-semibold">{cat.name}</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {cat.items.map((item, ii) => {
                        const resp = responses[item.id] ?? {};
                        const isNok = resp.response === "NOK";
                        const responseId = responseIdMap.get(item.id);
                        const pendingForItem = pendingPhotos.get(item.id) ?? [];
                        const existingPhotoCount = getExistingPhotoCount(item.id);
                        const totalPhotoCount = existingPhotoCount + (pendingPhotos.get(item.id)?.length ?? 0);
                        const isUnanswered = unansweredItemIds.has(item.id);
                        const isNokMissingDesc = nokMissingDescIds.has(item.id);

                        return (
                          <div
                            key={item.id}
                            ref={(el) => {
                              if (el) itemErrRefs.current.set(item.id, el);
                              else itemErrRefs.current.delete(item.id);
                            }}
                            className="px-4 py-3 space-y-2"
                            style={{
                              background: isUnanswered ? "rgba(240,62,62,0.04)" : "var(--white)",
                              borderLeft: isUnanswered ? "3px solid var(--accent4)" : undefined,
                              transition: "background 0.15s",
                            }}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                              <span className="text-sm flex-1 min-w-0" style={{ color: "var(--text)" }}>
                                <span className="font-mono text-xs mr-2" style={{ color: "var(--muted)" }}>
                                  {ii + 1}.
                                </span>
                                {item.label}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {responseId && (
                                  <PhotoIndicator
                                    count={totalPhotoCount}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setGalleryData({
                                        responseId,
                                        itemLabel: item.label,
                                        categoryName: cat.name,
                                      });
                                    }}
                                  />
                                )}
                                {(["OK", "NOK", "NA"] as ResponseType[]).map((rt) => (
                                  <button
                                    key={rt}
                                    type="button"
                                    onClick={() => setResponse(item.id, "response", resp.response === rt ? "" : rt)}
                                    className="rounded-md px-2.5 py-1 text-xs font-bold transition-all"
                                    style={{
                                      background:
                                        resp.response === rt
                                          ? rt === "OK"
                                            ? "var(--accent2)"
                                            : rt === "NOK"
                                            ? "var(--accent4)"
                                            : "var(--muted)"
                                          : "var(--bg)",
                                      color: resp.response === rt ? "#fff" : "var(--text2)",
                                      border: `1px solid ${
                                        resp.response === rt
                                          ? "transparent"
                                          : isUnanswered
                                          ? "#fca5a5"
                                          : "var(--border)"
                                      }`,
                                    }}
                                  >
                                    {rt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {isNok && (
                              <>
                                <input
                                  type="text"
                                  value={resp.ecartDescription ?? ""}
                                  onChange={(e) => setResponse(item.id, "ecartDescription", e.target.value)}
                                  placeholder="Description de l'écart observé…"
                                  className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
                                  style={{
                                    border: `1px solid ${isNokMissingDesc ? "#fca5a5" : "var(--accent4)"}`,
                                    color: "var(--text)",
                                    background: "var(--bg)",
                                  }}
                                />
                                {isNokMissingDesc && (
                                  <p className="text-xs" style={{ color: "var(--accent4)" }}>
                                    Veuillez décrire l'écart observé.
                                  </p>
                                )}
                                <ResponsePhotoUploader
                                  itemId={item.id}
                                  responseId={responseId}
                                  pendingFiles={pendingForItem}
                                  onAddFiles={(files) => handleAddFiles(item.id, files)}
                                  onRemovePending={(index) => handleRemovePending(item.id, index)}
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignations / Actions correctives */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text2)" }}>
                  Actions correctives ({assignments.length})
                </h3>
                <button
                  type="button"
                  onClick={addAssignment}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: "var(--accent2)" }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </button>
              </div>
              <div className="space-y-3">
                {assignments.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 space-y-2"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>Action #{i + 1}</span>
                      <button type="button" onClick={() => removeAssignment(i)} style={{ color: "var(--muted)" }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={a.action ?? ""}
                      onChange={(e) => updateAssignment(i, "action", e.target.value)}
                      placeholder="Description de l'action corrective…"
                      rows={2}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
                      style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>Responsable</label>
                        <input
                          type="text"
                          value={a.responsable ?? ""}
                          onChange={(e) => updateAssignment(i, "responsable", e.target.value)}
                          className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none"
                          style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>Délai</label>
                        <input
                          type="date"
                          value={a.delai ?? ""}
                          onChange={(e) => updateAssignment(i, "delai", e.target.value)}
                          className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none"
                          style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>Date réalisation</label>
                        <input
                          type="date"
                          value={a.dateRealisation ?? ""}
                          onChange={(e) => updateAssignment(i, "dateRealisation", e.target.value)}
                          className="w-full rounded-lg border px-2 py-1.5 text-sm outline-none"
                          style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {assignments.length === 0 && (
                  <p className="text-sm text-center py-3" style={{ color: "var(--muted)" }}>
                    Aucune action corrective ajoutée.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-4 py-3 sm:px-6 sm:py-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-lg px-4 py-2 text-sm font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--accent)", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* ── Photo Gallery (edit mode: delete allowed) ── */}
    {galleryData && (
      <PhotoGalleryModal
        responseId={galleryData.responseId}
        itemLabel={galleryData.itemLabel}
        categoryName={galleryData.categoryName}
        readOnly={false}
        onClose={() => setGalleryData(null)}
      />
    )}
    </>
  );
}
