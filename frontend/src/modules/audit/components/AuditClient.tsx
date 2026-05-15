import { useState, useMemo } from "react";
import {
  Plus, Pencil, Eye, ChevronLeft, ChevronRight, ClipboardCheck,
  CalendarDays, List, X, Activity, BarChart3, FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import axios from "axios";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { Loader } from "@/components/Loader";
import useAuth from "@/hooks/useAuth";
import { useFetchAudits } from "@/modules/audit/hooks/useFetchAudits";
import { useCreateAudit } from "@/modules/audit/hooks/useCreateAudit";
import { useUpdateAudit } from "@/modules/audit/hooks/useUpdateAudit";
import { usePatchAuditStatus } from "@/modules/audit/hooks/usePatchAuditStatus";
import { useFetchAuditStats } from "@/modules/audit/hooks/useFetchAuditStats";
import { useFetchAuditActivity } from "@/modules/audit/hooks/useFetchAuditActivity";
import { useFetchCadreEmployees } from "@/modules/audit/hooks/useFetchCadreEmployees";
import { useFetchTemplates } from "@/modules/checklist/hooks/useFetchTemplates";
import { AuditFormModal } from "./AuditFormModal";
import { AuditCalendar } from "./AuditCalendar";
import { ChecklistDetailModal } from "@/modules/checklist/components/ChecklistDetailModal";
import type { Audit, AuditStatus } from "@/modules/audit/types";

type AuditTab = "liste" | "calendrier";

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.message) return data.message;
    if (typeof data === "string") return data;
  }
  if (err instanceof Error) return err.message;
  return "Une erreur est survenue";
}

const STATUS_LABELS: Record<AuditStatus, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
  EN_RETARD: "En retard",
};

const STATUS_STYLE: Record<AuditStatus, { bg: string; color: string }> = {
  EN_ATTENTE: { bg: "rgba(255,140,0,0.12)", color: "var(--accent3)" },
  EN_COURS: { bg: "rgba(47,107,255,0.12)", color: "var(--accent)" },
  TERMINE: { bg: "rgba(0,196,140,0.12)", color: "var(--accent2)" },
  ANNULE: { bg: "rgba(240,62,62,0.12)", color: "var(--accent4)" },
  EN_RETARD: { bg: "rgba(220,80,0,0.12)", color: "#dc5000" },
};

const EVENT_LABELS: Record<string, string> = {
  PLANIFIE: "Audit planifié",
  NOTIF_ENVOYEE: "Notification envoyée à l'auditeur",
  RAPPEL_24H: "Rappel 24h envoyé",
  RAPPEL_JOUR: "Rappel jour J envoyé",
  COMMENCE: "Remplissage commencé",
  TERMINE: "Checklist validé et enregistré",
  ANNULE: "Audit annulé",
  MODIFIE: "Audit modifié",
  EN_RETARD: "Audit passé en retard",
};

function scoreColor(score: number) {
  if (score >= 96) return "var(--accent2)";
  if (score >= 60) return "var(--accent3)";
  return "var(--accent4)";
}

function ProgressBar({ filled, total }: { filled?: number; total?: number }) {
  if (filled == null || total == null || total === 0) return <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;
  const pct = Math.round((filled / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? "var(--accent2)" : "var(--accent)",
          }}
        />
      </div>
      <span className="text-xs" style={{ color: "var(--text2)" }}>{pct}%</span>
    </div>
  );
}

export function AuditClient() {
  const { auth } = useAuth();
  const role = auth?.user?.role;
  const canWrite = role === "INGENIEUR_HSE";

  const [tab, setTab] = useState<AuditTab>("liste");
  const [page, setPage] = useState(0);

  // Filtres
  const [filterStatus, setFilterStatus] = useState<AuditStatus | "">("");
  const [filterLine, setFilterLine] = useState("");
  const [filterEmployee, setFilterEmployee] = useState<number | "">("");

  const { data: auditsData, isLoading } = useFetchAudits(page, 20);
  const { data: stats } = useFetchAuditStats();
  const { data: templates = [] } = useFetchTemplates();
  const { data: cadreEmployees = [] } = useFetchCadreEmployees();
  const createMutation = useCreateAudit();
  const updateMutation = useUpdateAudit();
  const patchStatusMutation = usePatchAuditStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editAudit, setEditAudit] = useState<Audit | undefined>();
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>();
  const [detailAudit, setDetailAudit] = useState<Audit | null>(null);
  const [detailInstanceId, setDetailInstanceId] = useState<number | null>(null);
  const [activityAuditId, setActivityAuditId] = useState<number | null>(null);
  const { data: activityLogs = [], isLoading: activityLoading } = useFetchAuditActivity(activityAuditId);

  // Filtrage côté client (sur les résultats de la page)
  const filteredAudits = useMemo(() => {
    if (!auditsData?.content) return [];
    return auditsData.content.filter((a) => {
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterLine && !a.lineZone?.toLowerCase().includes(filterLine.toLowerCase())) return false;
      if (filterEmployee && a.assignedEmployeeId !== filterEmployee) return false;
      return true;
    });
  }, [auditsData?.content, filterStatus, filterLine, filterEmployee]);

  const hasFilters = filterStatus !== "" || filterLine !== "" || filterEmployee !== "";
  const clearFilters = () => { setFilterStatus(""); setFilterLine(""); setFilterEmployee(""); };

  const handleCreate = (date?: Date) => {
    setEditAudit(undefined);
    setPrefilledDate(date ? date.toISOString() : undefined);
    setFormOpen(true);
  };
  const handleEdit = (a: Audit) => { setEditAudit(a); setFormOpen(true); };

  const handleStatusChange = async (a: Audit) => {
    const options = Object.entries(STATUS_LABELS).filter(([k]) => k !== a.status);
    const { value: newStatus } = await Swal.fire({
      title: "Changer le statut",
      input: "select",
      inputOptions: Object.fromEntries(options),
      inputPlaceholder: "— Choisir un statut —",
      showCancelButton: true,
      confirmButtonText: "Appliquer",
      cancelButtonText: "Annuler",
    });
    if (!newStatus) return;
    patchStatusMutation.mutate(
      { id: a.id, status: newStatus as AuditStatus },
      {
        onSuccess: () => toast.success("Statut mis à jour"),
        onError: (err) => toast.error(extractErrorMessage(err)),
      }
    );
  };

  const statusBadge = (status: AuditStatus) => (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].color }}
    >
      {STATUS_LABELS[status]}
    </span>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Audits HSE" description="Planification et suivi des audits de sécurité" />
        {canWrite && (
          <button
            onClick={() => handleCreate()}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            <Plus className="h-4 w-4" />
            Planifier un audit
          </button>
        )}
      </div>

      <Separator />

      {/* ── Dashboard stats ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {[
            { label: "Total", value: stats.total, color: "var(--text)" },
            { label: "En attente", value: stats.enAttente, color: "var(--accent3)" },
            { label: "En cours", value: stats.enCours, color: "var(--accent)" },
            { label: "Terminés", value: stats.termine, color: "var(--accent2)" },
            { label: "Annulés", value: stats.annule, color: "var(--accent4)" },
            { label: "En retard", value: stats.enRetard, color: "#dc5000" },
            { label: "Taux complétion", value: `${stats.tauxCompletion}%`, color: "var(--accent2)" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl px-4 py-3 flex flex-col gap-1"
              style={{ background: "var(--white)", border: "1px solid var(--border)" }}
            >
              <span className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</span>
              <span className="text-xs" style={{ color: "var(--text2)" }}>{card.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Onglets Liste / Calendrier ── */}
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        {([["liste", "Liste des audits", List], ["calendrier", "Calendrier", CalendarDays]] as const).map(
          ([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: tab === key ? "var(--white)" : "transparent",
                color: tab === key ? "var(--text)" : "var(--text2)",
                boxShadow: tab === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          )
        )}
      </div>

      {/* ── Vue Calendrier ── */}
      {tab === "calendrier" && (
        <AuditCalendar
          canWrite={canWrite}
          onCreateAudit={handleCreate}
          onEditAudit={handleEdit}
        />
      )}

      {/* ── Vue Liste ── */}
      {tab === "liste" && (
        <>
          {/* Filtres */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text2)" }}>Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as AuditStatus | ""); setPage(0); }}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--white)", color: "var(--text)" }}
              >
                <option value="">Tous</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text2)" }}>Ligne / Zone</label>
              <input
                type="text"
                value={filterLine}
                onChange={(e) => { setFilterLine(e.target.value); setPage(0); }}
                placeholder="Filtrer…"
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--white)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text2)" }}>Auditeur</label>
              <select
                value={filterEmployee}
                onChange={(e) => { setFilterEmployee(e.target.value ? Number(e.target.value) : ""); setPage(0); }}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--white)", color: "var(--text)" }}
              >
                <option value="">Tous</option>
                {cadreEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm"
                style={{ background: "rgba(240,62,62,0.08)", color: "var(--accent4)" }}
              >
                <X className="h-3 w-3" /> Effacer
              </button>
            )}
          </div>

          {isLoading ? <Loader /> : (
            <>
              <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--white)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Date</th>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Ligne / Zone</th>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Modèle</th>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Auditeur</th>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Statut</th>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Avancement</th>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Score</th>
                        <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text2)" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAudits.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                            {hasFilters ? "Aucun audit ne correspond aux filtres" : "Aucun audit enregistré"}
                          </td>
                        </tr>
                      ) : filteredAudits.map((audit, i) => (
                        <tr
                          key={audit.id}
                          style={{ borderBottom: i < filteredAudits.length - 1 ? "1px solid var(--border)" : "none" }}
                          className="transition-colors hover:bg-[var(--bg)]"
                        >
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>
                            {audit.date ? new Date(audit.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </td>
                          <td className="px-4 py-3" style={{ color: "var(--text)" }}>{audit.lineZone || "—"}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {audit.templateTitle || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                            {audit.assignedEmployeeName || "—"}
                          </td>
                          <td className="px-4 py-3">{statusBadge(audit.status)}</td>
                          <td className="px-4 py-3">
                            <ProgressBar filled={audit.filledCount} total={audit.totalCount ?? audit.templateItemCount} />
                          </td>
                          <td className="px-4 py-3">
                            {audit.scorePercent != null ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-xs font-bold"
                                style={{ color: scoreColor(audit.scorePercent), background: `${scoreColor(audit.scorePercent)}18` }}
                              >
                                {audit.scorePercent}%
                              </span>
                            ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setDetailAudit(audit); setActivityAuditId(null); }}
                                title="Voir le détail"
                                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                                style={{ color: "var(--accent)" }}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setActivityAuditId(audit.id)}
                                title="Journal des activités"
                                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                                style={{ color: "var(--accent2)" }}
                              >
                                <Activity className="h-4 w-4" />
                              </button>
                              {canWrite && (
                                <>
                                  <button
                                    onClick={() => handleEdit(audit)}
                                    title="Modifier"
                                    className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                                    style={{ color: "var(--text2)" }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(audit)}
                                    title="Changer le statut"
                                    className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                                    style={{ color: "var(--accent3)" }}
                                  >
                                    <ClipboardCheck className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {auditsData && auditsData.totalPages > 1 && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    {`Page ${page + 1} sur ${auditsData.totalPages} — ${auditsData.totalElements} audit(s)`}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={auditsData.first}
                      className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                      style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(auditsData.totalPages - 1, p + 1))}
                      disabled={auditsData.last}
                      className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                      style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Audit Form Modal ── */}
      {formOpen && (
        <AuditFormModal
          initial={editAudit}
          prefilledDate={!editAudit ? prefilledDate : undefined}
          templates={templates}
          onSave={(data) => {
            if (editAudit) {
              updateMutation.mutate(
                { id: editAudit.id, data },
                {
                  onSuccess: () => { toast.success("Audit modifié"); setFormOpen(false); },
                  onError: (err) => toast.error(extractErrorMessage(err)),
                }
              );
            } else {
              createMutation.mutate(data, {
                onSuccess: () => { toast.success("Audit planifié — L'auditeur a été notifié"); setFormOpen(false); setPrefilledDate(undefined); },
                onError: (err) => toast.error(extractErrorMessage(err)),
              });
            }
          }}
          onClose={() => { setFormOpen(false); setPrefilledDate(undefined); }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* ── Detail Modal ── */}
      {detailAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col"
            style={{ background: "var(--white)", border: "1px solid var(--border)", maxHeight: "85vh" }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Détail de l'audit</h2>
              <button onClick={() => setDetailAudit(null)} style={{ color: "var(--muted)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <Row label="Date" value={detailAudit.date ? new Date(detailAudit.date).toLocaleString("fr-FR") : "—"} />
              <Row label="Ligne / Zone" value={detailAudit.lineZone || "—"} />
              <Row label="Modèle checklist" value={detailAudit.templateTitle || "—"} />
              <Row label="Auditeur assigné" value={detailAudit.assignedEmployeeName || "—"} />
              <Row label="Statut" value={STATUS_LABELS[detailAudit.status]} />
              {detailAudit.startedAt && (
                <Row label="Commencé le" value={new Date(detailAudit.startedAt).toLocaleString("fr-FR")} />
              )}
              {detailAudit.completedAt && (
                <Row label="Terminé le" value={new Date(detailAudit.completedAt).toLocaleString("fr-FR")} />
              )}
              {detailAudit.scorePercent != null && (
                <Row label="Score" value={`${detailAudit.scorePercent}%`} />
              )}
              {detailAudit.notes && (
                <div>
                  <span className="block text-xs font-semibold mb-1" style={{ color: "var(--text2)" }}>Notes</span>
                  <p className="text-sm rounded-lg p-3" style={{ background: "var(--bg)", color: "var(--text)" }}>
                    {detailAudit.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
              {detailAudit.instanceId ? (
                <button
                  onClick={() => {
                    setDetailInstanceId(detailAudit.instanceId!);
                    setDetailAudit(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white"
                  style={{ background: "var(--accent2)" }}
                >
                  <FileText className="h-4 w-4" />
                  Voir le checklist
                </button>
              ) : (
                <button
                  disabled
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium opacity-50 cursor-not-allowed"
                  style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                >
                  <FileText className="h-4 w-4" />
                  Checklist non rempli
                </button>
              )}
              <button
                onClick={() => setDetailAudit(null)}
                className="flex-1 rounded-lg py-2 text-sm font-medium"
                style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checklist Detail Modal ── */}
      {detailInstanceId !== null && (
        <ChecklistDetailModal
          instanceId={detailInstanceId}
          onClose={() => setDetailInstanceId(null)}
        />
      )}

      {/* ── Activity Log Modal ── */}
      {activityAuditId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col"
            style={{ background: "var(--white)", border: "1px solid var(--border)", maxHeight: "85vh" }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" style={{ color: "var(--accent2)" }} />
                <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Journal des activités</h2>
              </div>
              <button onClick={() => setActivityAuditId(null)} style={{ color: "var(--muted)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activityLoading ? (
                <Loader />
              ) : activityLogs.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>
                  Aucune activité enregistrée
                </p>
              ) : (
                <div className="relative">
                  <div
                    className="absolute left-[7px] top-0 bottom-0 w-0.5"
                    style={{ background: "var(--border)" }}
                  />
                  <div className="space-y-4 pl-6">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="relative">
                        <div
                          className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2"
                          style={{ background: "var(--white)", borderColor: "var(--accent)" }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                              {EVENT_LABELS[log.eventType] ?? log.eventType}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>{log.detail}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {log.performedByName && (
                              <span className="text-xs" style={{ color: "var(--muted)" }}>
                                {log.performedByName}
                              </span>
                            )}
                            {!log.performedByName && (
                              <span className="text-xs" style={{ color: "var(--muted)" }}>Système</span>
                            )}
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              · {new Date(log.performedAt).toLocaleString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setActivityAuditId(null)}
                className="w-full rounded-lg py-2 text-sm font-medium"
                style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-semibold w-36 shrink-0 pt-0.5" style={{ color: "var(--text2)" }}>{label}</span>
      <span className="text-sm" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}
