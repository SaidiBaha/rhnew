import { useState, useMemo } from "react";
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

  // ── Recherche ligne / zone ──
  const [lineSearch, setLineSearch] = useState("");
  const [lineOpen, setLineOpen] = useState(false);

  // ── Recherche modèle de checklist ──
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);

  // ── Recherche auditeur (CADRE) ──
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOpen, setEmployeeOpen] = useState(false);

  // ── Listes filtrées ──
  const filteredLines = useMemo(() => {
    const term = lineSearch.trim().toLowerCase();
    if (!term) return productionLines;
    return productionLines.filter((pl) => pl.name.toLowerCase().includes(term));
  }, [productionLines, lineSearch]);

  const selectedLine = useMemo(
    () => productionLines.find((pl) => pl.name === lineZone) ?? null,
    [productionLines, lineZone]
  );

  const filteredTemplates = useMemo(() => {
    const term = templateSearch.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((t) => t.title.toLowerCase().includes(term));
  }, [templates, templateSearch]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return cadreEmployees;
    return cadreEmployees.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(term) ||
        emp.matricule.toLowerCase().includes(term)
    );
  }, [cadreEmployees, employeeSearch]);

  const selectedEmployee = useMemo(
    () => cadreEmployees.find((emp) => emp.id === assignedEmployeeId) ?? null,
    [cadreEmployees, assignedEmployeeId]
  );

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

  const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const inputStyle = { border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" };

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
                className={inputCls}
                style={inputStyle}
              />
            </div>

            {/* Ligne / Zone — recherche filtrée par nom */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Ligne / Zone auditée <span style={{ color: "var(--accent4)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={`${inputCls} pr-8`}
                  style={!lineZone
                    ? { ...inputStyle, borderColor: "#fca5a5" }
                    : { ...inputStyle, borderColor: "var(--accent)" }}
                  placeholder="Rechercher par nom de ligne…"
                  value={lineOpen ? lineSearch : (selectedLine ? selectedLine.name : lineZone)}
                  onFocus={() => { setLineOpen(true); setLineSearch(""); }}
                  onChange={(e) => setLineSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setLineOpen(false), 180)}
                  autoComplete="off"
                />
                {lineZone && (
                  <button
                    type="button"
                    onMouseDown={() => { setLineZone(""); setLineSearch(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    ✕
                  </button>
                )}
                {lineOpen && (
                  <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredLines.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-slate-400">Aucune ligne trouvée.</p>
                    ) : (
                      filteredLines.map((pl) => (
                        <button
                          key={pl.id}
                          type="button"
                          onMouseDown={() => {
                            setLineZone(pl.name);
                            setLineOpen(false);
                            setLineSearch("");
                          }}
                          className="flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                          style={lineZone === pl.name
                            ? { background: "var(--accent-soft)", fontWeight: 600, color: "var(--accent)" }
                            : { color: "var(--text)" }}
                        >
                          {pl.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modèle de checklist — recherche filtrée par titre */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Modèle de checklist <span style={{ color: "var(--accent4)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={`${inputCls} pr-8`}
                  style={!templateId
                    ? { ...inputStyle, borderColor: "#fca5a5" }
                    : { ...inputStyle, borderColor: "var(--accent)" }}
                  placeholder="Rechercher par titre…"
                  value={templateOpen
                    ? templateSearch
                    : (selectedTemplate
                        ? `${selectedTemplate.title} (${selectedTemplate.itemCount} point${selectedTemplate.itemCount !== 1 ? "s" : ""})`
                        : "")}
                  onFocus={() => { setTemplateOpen(true); setTemplateSearch(""); }}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setTemplateOpen(false), 180)}
                  autoComplete="off"
                />
                {templateId !== "" && (
                  <button
                    type="button"
                    onMouseDown={() => { setTemplateId(""); setTemplateSearch(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    ✕
                  </button>
                )}
                {templateOpen && (
                  <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredTemplates.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-slate-400">Aucun modèle trouvé.</p>
                    ) : (
                      filteredTemplates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={() => {
                            setTemplateId(t.id);
                            setTemplateOpen(false);
                            setTemplateSearch("");
                          }}
                          className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                          style={templateId === t.id ? { background: "var(--accent-soft)" } : {}}
                        >
                          <span
                            className="text-sm font-semibold"
                            style={templateId === t.id ? { color: "var(--accent)" } : { color: "var(--text)" }}
                          >
                            {t.title}
                          </span>
                          <span className="text-xs text-slate-500">
                            {t.itemCount} point{t.itemCount !== 1 ? "s" : ""}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Auditeur assigné — recherche filtrée par nom / matricule (CADRE) */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Auditeur assigné{" "}
                <span style={{ color: "var(--text2)", fontSize: 11 }}>(CADRE)</span>{" "}
                <span style={{ color: "var(--accent4)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={`${inputCls} pr-8`}
                  style={!assignedEmployeeId
                    ? { ...inputStyle, borderColor: "#fca5a5" }
                    : { ...inputStyle, borderColor: "var(--accent)" }}
                  placeholder="Rechercher par nom ou matricule…"
                  value={employeeOpen
                    ? employeeSearch
                    : (selectedEmployee ? `${selectedEmployee.fullName} — ${selectedEmployee.matricule}` : "")}
                  onFocus={() => { setEmployeeOpen(true); setEmployeeSearch(""); }}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setEmployeeOpen(false), 180)}
                  autoComplete="off"
                />
                {assignedEmployeeId !== "" && (
                  <button
                    type="button"
                    onMouseDown={() => { setAssignedEmployeeId(""); setEmployeeSearch(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    ✕
                  </button>
                )}
                {employeeOpen && (
                  <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredEmployees.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-slate-400">Aucun auditeur CADRE trouvé.</p>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onMouseDown={() => {
                            setAssignedEmployeeId(emp.id);
                            setEmployeeOpen(false);
                            setEmployeeSearch("");
                          }}
                          className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                          style={assignedEmployeeId === emp.id ? { background: "var(--accent-soft)" } : {}}
                        >
                          <span className="text-sm font-semibold text-slate-900">{emp.fullName}</span>
                          <span className="text-xs text-slate-500">Matricule : {emp.matricule}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {cadreEmployees.length === 0 && (
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    Aucun employé CADRE disponible.
                  </p>
                )}
              </div>
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
                style={inputStyle}
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
