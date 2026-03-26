import { X, Trash2, Calendar, User, Briefcase, UserCheck, FileText, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { statusColor } from "@/modules/request/components/columns";
import type { RequestColumn } from "@/modules/request/components/columns";
import { useDeleteRequest } from "@/lib/data/request";
import useAuth from "@/hooks/useAuth";

interface RequestDetailModalProps {
  card: RequestColumn;
  onClose: () => void;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  ATTESTATION_DE_TRAVAIL:  "Attestation de Travail",
  ATTESTATION_DE_SALAIRE:  "Attestation de Salaire",
  FICHE_DE_PAIE:           "Fiche de Paie",
  "DÉCLARATION_D_IMPÔTS":  "Déclaration d'Impôts",
  RNE:                     "RNE",
};

export function RequestDetailModal({ card, onClose }: RequestDetailModalProps) {
  const { auth } = useAuth();
  const isSupervisor = auth.user?.role === "SUPERVISOR";
  const canDelete = isSupervisor && card.status === "SOUMIS";

  const deleteRequest = useDeleteRequest();

  function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) return;
    deleteRequest.mutate(card.id, {
      onSuccess: onClose,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}
        >
          <div className="flex items-center gap-3">
            <Badge className={`${statusColor(card.status)} text-xs px-2 py-0.5`}>
              {card.status}
            </Badge>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)" }}>
              {REQUEST_TYPE_LABELS[card.requestType] || card.requestType.replace(/_/g, " ")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--steel-light)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
            }}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Employee section */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)" }}>
              Employé
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <User className="size-4 shrink-0" style={{ color: "var(--text-3)" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-1)" }}>
                  {card.employee.fullName}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                  #{card.employee.matricule}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Briefcase className="size-4 shrink-0" style={{ color: "var(--text-3)" }} />
                <span style={{ fontSize: "13px", color: "var(--text-2)" }}>
                  {card.employee.jobTitle}
                </span>
              </div>
              {card.employee.department && (
                <div className="flex items-center gap-2.5">
                  <Tag className="size-4 shrink-0" style={{ color: "var(--text-3)" }} />
                  <span style={{ fontSize: "13px", color: "var(--text-2)" }}>
                    {card.employee.department}
                  </span>
                </div>
              )}
              {card.supervisor && card.supervisor !== "—" && (
                <div className="flex items-center gap-2.5">
                  <UserCheck className="size-4 shrink-0" style={{ color: "var(--text-3)" }} />
                  <span style={{ fontSize: "13px", color: "var(--text-2)" }}>
                    {card.supervisor}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Request details */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)" }}>
              Demande
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <FileText className="size-4 shrink-0" style={{ color: "var(--text-3)" }} />
                <span style={{ fontSize: "13px", color: "var(--text-2)" }}>
                  {REQUEST_TYPE_LABELS[card.requestType] || card.requestType.replace(/_/g, " ")}
                </span>
              </div>
              {card.comment && (
                <div className="flex items-start gap-2.5">
                  <FileText className="size-4 shrink-0 mt-0.5" style={{ color: "var(--text-3)" }} />
                  <span style={{ fontSize: "13px", color: "var(--text-2)", fontStyle: "italic" }}>
                    "{card.comment}"
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dates & users */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)" }}>
              Historique
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Calendar className="size-4 shrink-0" style={{ color: "var(--text-3)" }} />
                <span style={{ fontSize: "12px", color: "var(--text-3)" }}>Créé le</span>
                <span style={{ fontSize: "12px", color: "var(--text-2)", fontWeight: 500 }}>
                  {card.createdAt}
                </span>
                {card.createdBy && (
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    par <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{card.createdBy}</span>
                  </span>
                )}
              </div>
              {card.updatedAt && (
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 shrink-0" style={{ color: "var(--text-3)" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>Modifié le</span>
                  <span style={{ fontSize: "12px", color: "var(--text-2)", fontWeight: 500 }}>
                    {card.updatedAt}
                  </span>
                  {card.updatedBy && (
                    <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                      par <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{card.updatedBy}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)" }}
        >
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleteRequest.isPending}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
              style={{ background: "var(--red-soft)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#fee2e2";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--red-soft)";
              }}
            >
              <Trash2 className="size-4" />
              {deleteRequest.isPending ? "Suppression..." : "Supprimer"}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-all"
            style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface)";
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}