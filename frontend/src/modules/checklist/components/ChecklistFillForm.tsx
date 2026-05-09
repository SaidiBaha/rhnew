import { useCallback, useState } from "react";
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
}

export function ChecklistFillForm({ template, initial, prefill, onSave, onClose, loading }: Props) {
  const [date, setDate] = useState(initial?.date ?? prefill?.date ?? new Date().toISOString().split("T")[0]);
  const [lineUnit, setLineUnit] = useState(initial?.lineUnit ?? prefill?.lineUnit ?? "");
  const [teamLeader, setTeamLeader] = useState(initial?.teamLeader ?? "");
  const [auditor, setAuditor] = useState(initial?.auditor ?? prefill?.auditor ?? "");
  const [auditorVisa, setAuditorVisa] = useState(initial?.auditorVisa ?? prefill?.auditorVisa ?? "");
  const [lineResponsible, setLineResponsible] = useState(initial?.lineResponsible ?? "");

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
      return;
    }

    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value || undefined },
    }));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--white)", border: "1px solid var(--border)", maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {initial ? "Modifier la checklist" : "Remplir la checklist"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{template.title}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

            {/* En-tête */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>Informations générales</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Date", value: date, onChange: setDate, type: "date", readOnly: !initial && !!prefill?.date },
                  { label: "Ligne / Unité", value: lineUnit, onChange: setLineUnit, type: "text", readOnly: !initial && !!prefill?.lineUnit },
                  { label: "Chef d'équipe", value: teamLeader, onChange: setTeamLeader, type: "text", readOnly: false },
                  { label: "Auditeur", value: auditor, onChange: setAuditor, type: "text", readOnly: !initial && !!prefill?.auditor },
                  { label: "Visa auditeur", value: auditorVisa, onChange: setAuditorVisa, type: "text", readOnly: !initial && !!prefill?.auditorVisa },
                  { label: "Responsable ligne/unité", value: lineResponsible, onChange: setLineResponsible, type: "text", readOnly: false },
                ].map(({ label, value, onChange, type, readOnly }) => (
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
                      type={type}
                      value={value}
                      onChange={(e) => !readOnly && onChange(e.target.value)}
                      readOnly={readOnly}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        background: "var(--bg)",
                        opacity: readOnly ? 0.75 : 1,
                        cursor: readOnly ? "not-allowed" : "text",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Points à vérifier */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>Points à vérifier</h3>
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

                        return (
                          <div key={item.id} className="px-4 py-3 space-y-2" style={{ background: "var(--white)" }}>
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-sm flex-1" style={{ color: "var(--text)" }}>
                                <span className="font-mono text-xs mr-2" style={{ color: "var(--muted)" }}>
                                  {ii + 1}.
                                </span>
                                {item.label}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {(["OK", "NOK", "NA"] as ResponseType[]).map((rt) => (
                                  <button
                                    key={rt}
                                    type="button"
                                    onClick={() => setResponse(item.id, "response", resp.response === rt ? "" : rt)}
                                    className="rounded-md px-2.5 py-1 text-xs font-bold transition-all"
                                    style={{
                                      background: resp.response === rt
                                        ? rt === "OK" ? "var(--accent2)" : rt === "NOK" ? "var(--accent4)" : "var(--muted)"
                                        : "var(--bg)",
                                      color: resp.response === rt ? "#fff" : "var(--text2)",
                                      border: `1px solid ${resp.response === rt ? "transparent" : "var(--border)"}`,
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
                                  style={{ border: "1px solid var(--accent4)", color: "var(--text)", background: "var(--bg)" }}
                                />
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
                    <div className="grid grid-cols-3 gap-2">
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
            className="flex justify-end gap-2 px-6 py-4"
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
              type="submit"
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--accent)", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
