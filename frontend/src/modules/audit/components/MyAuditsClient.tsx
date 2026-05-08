import { useState } from "react";
import { ClipboardList, Eye, X, CheckCircle, FileText } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { Loader } from "@/components/Loader";
import useAuth from "@/hooks/useAuth";
import { useFetchMyAudits } from "@/modules/audit/hooks/useFetchMyAudits";
import { usePatchAuditStatus } from "@/modules/audit/hooks/usePatchAuditStatus";
import { useFetchTemplateById } from "@/modules/checklist/hooks/useFetchTemplateById";
import { useCreateInstance } from "@/modules/checklist/hooks/useCreateInstance";
import { useUpdateInstance } from "@/modules/checklist/hooks/useUpdateInstance";
import { ChecklistFillForm } from "@/modules/checklist/components/ChecklistFillForm";
import { ChecklistDetailModal } from "@/modules/checklist/components/ChecklistDetailModal";
import type { Audit, AuditStatus } from "@/modules/audit/types";
import type { SaveInstanceRequest } from "@/modules/checklist/types";
import { useQueryClient } from "@tanstack/react-query";

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
};

const STATUS_STYLE: Record<AuditStatus, { bg: string; color: string }> = {
  EN_ATTENTE: { bg: "rgba(255,140,0,0.12)", color: "var(--accent3)" },
  EN_COURS: { bg: "rgba(47,107,255,0.12)", color: "var(--accent)" },
  TERMINE: { bg: "rgba(0,196,140,0.12)", color: "var(--accent2)" },
  ANNULE: { bg: "rgba(240,62,62,0.12)", color: "var(--accent4)" },
};

export function MyAuditsClient() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const { data: audits = [], isLoading } = useFetchMyAudits();
  const patchStatus = usePatchAuditStatus();
  const createInstance = useCreateInstance();
  const updateInstance = useUpdateInstance();

  const [fillAudit, setFillAudit] = useState<Audit | null>(null);
  const [detailAudit, setDetailAudit] = useState<Audit | null>(null);
  const [detailInstanceId, setDetailInstanceId] = useState<number | null>(null);

  // Fetch du template de la checklist à remplir
  const { data: fillTemplate, isLoading: templateLoading } = useFetchTemplateById(
    fillAudit?.templateId ?? null
  );

  const canFill = (a: Audit) => a.status === "EN_ATTENTE" || a.status === "EN_COURS";

  const handleOpenFill = (audit: Audit) => {
    setFillAudit(audit);
    // Passage automatique à EN_COURS si le formulaire est ouvert pour la première fois
    if (audit.status === "EN_ATTENTE") {
      patchStatus.mutate(
        { id: audit.id, status: "EN_COURS" },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-audits"] });
          },
        }
      );
    }
  };

  const handleSaveChecklist = (data: SaveInstanceRequest) => {
    if (!fillAudit) return;
    const payload: SaveInstanceRequest = {
      ...data,
      auditId: fillAudit.id,
      status: "COMPLETE",
    };

    const afterSave = () => {
      patchStatus.mutate(
        { id: fillAudit.id, status: "TERMINE" },
        {
          onSuccess: () => {
            toast.success("Checklist validé — L'INGÉNIEUR HSE a été notifié");
            queryClient.invalidateQueries({ queryKey: ["my-audits"] });
            setFillAudit(null);
          },
          onError: (err) => toast.error(extractErrorMessage(err)),
        }
      );
    };

    if (fillAudit.instanceId) {
      updateInstance.mutate(
        { id: fillAudit.instanceId, data: payload },
        { onSuccess: afterSave, onError: (err) => toast.error(extractErrorMessage(err)) }
      );
    } else {
      createInstance.mutate(payload, {
        onSuccess: afterSave,
        onError: (err) => toast.error(extractErrorMessage(err)),
      });
    }
  };

  const stats = {
    total: audits.length,
    enAttente: audits.filter((a) => a.status === "EN_ATTENTE").length,
    enCours: audits.filter((a) => a.status === "EN_COURS").length,
    termine: audits.filter((a) => a.status === "TERMINE").length,
  };

  const isSaving = createInstance.isPending || updateInstance.isPending || patchStatus.isPending;

  // Prefill depuis l'audit : date, ligne, auditeur (nom + matricule)
  const fillPrefill = fillAudit
    ? {
        date: fillAudit.date?.split("T")[0],
        lineUnit: fillAudit.lineZone ?? undefined,
        auditor: fillAudit.assignedEmployeeName ?? undefined,
        auditorVisa: fillAudit.assignedEmployeeMatricule ?? undefined,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Heading title="Mes Audits" description="Audits HSE qui me sont assignés" />
      <Separator />

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total assignés", value: stats.total, color: "var(--text)" },
          { label: "En attente", value: stats.enAttente, color: "var(--accent3)" },
          { label: "En cours", value: stats.enCours, color: "var(--accent)" },
          { label: "Terminés", value: stats.termine, color: "var(--accent2)" },
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

      {isLoading ? <Loader /> : audits.length === 0 ? (
        <div
          className="rounded-2xl py-16 flex flex-col items-center gap-3"
          style={{ background: "var(--white)", border: "1px solid var(--border)" }}
        >
          <ClipboardList className="h-12 w-12" style={{ color: "var(--muted)" }} />
          <p className="text-sm" style={{ color: "var(--muted)" }}>Aucun audit ne vous est assigné</p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl"
          style={{ border: "1px solid var(--border)", background: "var(--white)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Date</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Ligne / Zone</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Modèle checklist</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Statut</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Score</th>
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text2)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit, i) => (
                  <tr
                    key={audit.id}
                    style={{ borderBottom: i < audits.length - 1 ? "1px solid var(--border)" : "none" }}
                    className="transition-colors hover:bg-[var(--bg)]"
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>
                      {audit.date
                        ? new Date(audit.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{audit.lineZone || "—"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>{audit.templateTitle || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background: STATUS_STYLE[audit.status].bg,
                          color: STATUS_STYLE[audit.status].color,
                        }}
                      >
                        {STATUS_LABELS[audit.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {audit.scorePercent != null ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{
                            color:
                              audit.scorePercent >= 96
                                ? "var(--accent2)"
                                : audit.scorePercent >= 60
                                ? "var(--accent3)"
                                : "var(--accent4)",
                            background: `${
                              audit.scorePercent >= 96
                                ? "var(--accent2)"
                                : audit.scorePercent >= 60
                                ? "var(--accent3)"
                                : "var(--accent4)"
                            }18`,
                          }}
                        >
                          {audit.scorePercent}%
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Voir le checklist rempli (si instance disponible) */}
                        {audit.instanceId && (
                          <button
                            onClick={() => setDetailInstanceId(audit.instanceId!)}
                            title="Voir le checklist rempli"
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                            style={{ color: "var(--accent2)" }}
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        {/* Voir le détail de l'audit */}
                        <button
                          onClick={() => setDetailAudit(audit)}
                          title="Voir le détail"
                          className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                          style={{ color: "var(--accent)" }}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canFill(audit) && audit.templateId && (
                          <button
                            onClick={() => handleOpenFill(audit)}
                            title="Remplir le checklist"
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: "var(--accent2)" }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Remplir le checklist
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formulaire de remplissage — ChecklistFillForm gère son propre overlay */}
      {fillAudit && (
        templateLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <Loader />
          </div>
        ) : fillTemplate ? (
          <ChecklistFillForm
            template={fillTemplate}
            initial={fillAudit.instance ?? undefined}
            prefill={fillPrefill}
            onSave={handleSaveChecklist}
            onClose={() => setFillAudit(null)}
            loading={isSaving}
          />
        ) : null
      )}

      {/* Checklist detail modal (lecture seule + export) */}
      {detailInstanceId !== null && (
        <ChecklistDetailModal
          instanceId={detailInstanceId}
          onClose={() => setDetailInstanceId(null)}
        />
      )}

      {/* Modal détail audit */}
      {detailAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col"
            style={{ background: "var(--white)", border: "1px solid var(--border)", maxHeight: "85vh" }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Détail de l'audit</h2>
              <button onClick={() => setDetailAudit(null)} style={{ color: "var(--muted)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <Row label="Date" value={detailAudit.date ? new Date(detailAudit.date).toLocaleString("fr-FR") : "—"} />
              <Row label="Ligne / Zone" value={detailAudit.lineZone || "—"} />
              <Row label="Modèle checklist" value={detailAudit.templateTitle || "—"} />
              <Row label="Statut" value={STATUS_LABELS[detailAudit.status]} />
              {detailAudit.startedAt && (
                <Row label="Commencé le" value={new Date(detailAudit.startedAt).toLocaleString("fr-FR")} />
              )}
              {detailAudit.completedAt && (
                <Row label="Terminé le" value={new Date(detailAudit.completedAt).toLocaleString("fr-FR")} />
              )}
              {detailAudit.scorePercent != null && (
                <Row label="Score final" value={`${detailAudit.scorePercent}%`} />
              )}
              {detailAudit.notes && (
                <div>
                  <span className="block text-xs font-semibold mb-1" style={{ color: "var(--text2)" }}>
                    Notes de l'INGÉNIEUR HSE
                  </span>
                  <p className="text-sm rounded-lg p-3" style={{ background: "var(--bg)", color: "var(--text)" }}>
                    {detailAudit.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setDetailAudit(null)}
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
      <span className="text-xs font-semibold w-36 shrink-0 pt-0.5" style={{ color: "var(--text2)" }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}
