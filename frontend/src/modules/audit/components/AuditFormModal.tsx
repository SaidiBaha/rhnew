import { useState } from "react";
import { X } from "lucide-react";
import type { Audit, CreateAuditRequest } from "@/modules/audit/types";
import type { ChecklistTemplateSummary } from "@/modules/checklist/types";
import { useFetchCadreEmployees } from "@/modules/audit/hooks/useFetchCadreEmployees";
import { useFetchProductionLinesAdmin } from "@/modules/production-line/hooks/useFetchProductionLinesAdmin";

interface Props {
  initial?: Audit;
  prefilledDate?: string;
  templates: ChecklistTemplateSummary[];
  onSave: (data: CreateAuditRequest) => void;
  onClose: () => void;
  loading: boolean;
}

export function AuditFormModal({ initial, prefilledDate, templates, onSave, onClose, loading }: Props) {
  const { data: cadreEmployees = [] } = useFetchCadreEmployees();
  const { data: productionLines = [] } = useFetchProductionLinesAdmin();

  const [date, setDate] = useState(
    initial?.date
      ? initial.date.substring(0, 16)
      : prefilledDate
      ? prefilledDate.substring(0, 16)
      : new Date().toISOString().substring(0, 16)
  );
  const [lineZone, setLineZone] = useState(initial?.lineZone ?? "");
  const [templateId, setTemplateId] = useState<number | "">(initial?.templateId ?? "");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<number | "">(
    initial?.assignedEmployeeId ?? ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: date ? new Date(date).toISOString() : undefined,
      lineZone: lineZone || undefined,
      templateId: templateId !== "" ? Number(templateId) : null,
      assignedEmployeeId: assignedEmployeeId !== "" ? Number(assignedEmployeeId) : null,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--white)", border: "1px solid var(--border)", maxHeight: "90vh" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {initial ? "Modifier l'audit" : "Planifier un audit"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* Date */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Date et heure de l'audit <span style={{ color: "var(--accent4)" }}>*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
              />
            </div>

            {/* Ligne / Zone — select depuis production_lines */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Ligne / Zone auditée <span style={{ color: "var(--accent4)" }}>*</span>
              </label>
              <select
                required
                value={lineZone}
                onChange={(e) => setLineZone(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
              >
                <option value="">— Sélectionner une ligne —</option>
                {productionLines.map((pl) => (
                  <option key={pl.id} value={pl.name}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modèle de checklist */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Modèle de checklist <span style={{ color: "var(--accent4)" }}>*</span>
              </label>
              <select
                required
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value !== "" ? Number(e.target.value) : "")}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
              >
                <option value="">— Sélectionner un modèle —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.itemCount} point{t.itemCount !== 1 ? "s" : ""})
                  </option>
                ))}
              </select>
            </div>

            {/* Employé assigné — CADRE uniquement */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Auditeur assigné <span style={{ color: "var(--text2)", fontSize: 11 }}>(CADRE)</span>{" "}
                <span style={{ color: "var(--accent4)" }}>*</span>
              </label>
              <select
                required
                value={assignedEmployeeId}
                onChange={(e) =>
                  setAssignedEmployeeId(e.target.value !== "" ? Number(e.target.value) : "")
                }
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
              >
                <option value="">— Sélectionner un auditeur —</option>
                {cadreEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.matricule})
                  </option>
                ))}
              </select>
              {cadreEmployees.length === 0 && (
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                  Aucun employé CADRE disponible.
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Notes / Observations
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Observations, contexte…"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
                style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
              />
            </div>
          </div>

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
