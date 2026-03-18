import { useState, useRef } from "react";
import { Calendar, User, Briefcase, UserCheck, GripVertical, Download, Edit } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SaveRequestModal } from "@/modules/request/components/SaveRequestModal";
import { useUpdateRequest, useCloseRequest } from "@/lib/data/request";
import useAuth from "@/hooks/useAuth";
import { type RequestColumn, statusColor } from "@/modules/request/components/columns";
import type { RequestStatus } from "@/modules/request/types";

// ─── Columns ─────────────────────────────────────────────────────────────────

type KanbanCol = { id: RequestStatus; label: string };

const ALL_COLUMNS: KanbanCol[] = [
  { id: "SOUMIS",  label: "Soumis"  },
  { id: "TRAITÉ",  label: "Traité"  },
  { id: "CLÔTURÉ", label: "Clôturé" },
  { id: "REJETÉ",  label: "Rejeté"  },
  { id: "ANNULÉ",  label: "Annulé"  },
];

const SUPERVISOR_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  SOUMIS: ["ANNULÉ"],
};

const ADMIN_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  SOUMIS: ["TRAITÉ", "REJETÉ"],
};

// ─── Colours ──────────────────────────────────────────────────────────────────

const colBg: Record<RequestStatus, string> = {
  SOUMIS:  "bg-blue-50    border-blue-200",
  TRAITÉ:  "bg-emerald-50 border-emerald-200",
  REJETÉ:  "bg-red-50     border-red-200",
  ANNULÉ:  "bg-orange-50  border-orange-200",
  CLÔTURÉ: "bg-slate-100  border-slate-300",
};

const colHeaderColor: Record<RequestStatus, string> = {
  SOUMIS:  "text-blue-700",
  TRAITÉ:  "text-emerald-700",
  REJETÉ:  "text-red-700",
  ANNULÉ:  "text-orange-700",
  CLÔTURÉ: "text-slate-600",
};

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  card: RequestColumn;
  isDragging: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDownload: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function RequestCard({
  card, isDragging, isAdmin, onEdit, onDownload, onDragStart, onDragEnd,
}: CardProps) {
  const showDownload = card.status === "TRAITÉ";

  const isDraggable =
    (isAdmin && !!ADMIN_TRANSITIONS[card.status]) ||
    (!isAdmin && !!SUPERVISOR_TRANSITIONS[card.status]);

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable ? onDragStart : undefined}
      onDragEnd={isDraggable ? onDragEnd : undefined}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-3 select-none
        transition-all duration-150
        ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
        ${isDragging ? "opacity-30 scale-95 shadow-none" : "hover:shadow-md hover:-translate-y-0.5"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge className={`${statusColor(card.status)} text-[10px] px-1.5 py-0.5 shrink-0 leading-none`}>
          {card.status}
        </Badge>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            title="Modifier"
          >
            <Edit className="size-3.5" />
          </button>
          {showDownload && (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
              title="Télécharger et clôturer"
            >
              <Download className="size-3.5" />
            </button>
          )}
          {isDraggable && <GripVertical className="size-3.5 text-gray-300 ml-0.5" />}
        </div>
      </div>

      <p className="text-sm font-semibold text-gray-800 leading-tight mb-2">
        {card.requestType.replace(/_/g, " ")}
      </p>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <User className="size-3 shrink-0 text-gray-400" />
          <span className="font-medium truncate">{card.employee.fullName}</span>
          <span className="text-gray-400 shrink-0 text-[10px]">#{card.employee.matricule}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Briefcase className="size-3 shrink-0 text-gray-400" />
          <span className="truncate">{card.employee.jobTitle}</span>
        </div>

        {card.supervisor && card.supervisor !== "—" && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <UserCheck className="size-3 shrink-0 text-gray-400" />
            <span className="truncate">{card.supervisor}</span>
          </div>
        )}

        {card.comment && (
          <p className="text-[11px] text-gray-400 italic truncate mt-1 pt-1 border-t border-gray-50">
            "{card.comment}"
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100">
          <Calendar className="size-3 shrink-0" />
          <span>{card.createdAt}</span>
          {card.createdBy && (
            <span className="ml-auto truncate text-right max-w-[80px]" title={card.createdBy}>
              {card.createdBy}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColProps {
  col: KanbanCol;
  cards: RequestColumn[];
  dragOverState: "valid" | "invalid" | null;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onEdit: (card: RequestColumn) => void;
  onDownload: (card: RequestColumn) => void;
  draggingId: string | null;
  isAdmin: boolean;
  onCardDragStart: (card: RequestColumn, e: React.DragEvent) => void;
  onCardDragEnd: () => void;
}

function KanbanColumn({
  col, cards, dragOverState, onDragOver, onDragLeave, onDrop,
  onEdit, onDownload, draggingId, isAdmin, onCardDragStart, onCardDragEnd,
}: ColProps) {
  return (
    <div
      className={`flex flex-col rounded-xl border-2 min-h-[320px] transition-all duration-150
        ${colBg[col.id]}
        ${dragOverState === "valid"   ? "ring-2 ring-blue-400 border-blue-400 scale-[1.02]" : ""}
        ${dragOverState === "invalid" ? "ring-2 ring-rose-300 border-rose-300 opacity-60"   : ""}`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="px-3 py-2.5 border-b border-inherit flex items-center justify-between">
        <h3 className={`text-sm font-bold ${colHeaderColor[col.id]}`}>{col.label}</h3>
        <span className="text-xs font-semibold bg-white/60 text-gray-600 rounded-full px-2 py-0.5 border border-white/40 tabular-nums">
          {cards.length}
        </span>
      </div>

      {dragOverState === "valid" && (
        <div className="mx-2 mt-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 text-center text-xs text-blue-500 py-2 font-medium">
          Déposer ici
        </div>
      )}

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[580px]">
        {cards.length === 0 && dragOverState !== "valid" && (
          <div className="flex items-center justify-center h-16 text-xs text-gray-400 italic">
            Aucune demande
          </div>
        )}
        {cards.map((card) => (
          <RequestCard
            key={card.id}
            card={card}
            isDragging={draggingId === card.id}
            isAdmin={isAdmin}
            onEdit={() => onEdit(card)}
            onDownload={() => onDownload(card)}
            onDragStart={(e) => onCardDragStart(card, e)}
            onDragEnd={onCardDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

interface RequestKanbanProps {
  data: RequestColumn[];
}

export function RequestKanban({ data }: RequestKanbanProps) {
  const { auth } = useAuth();
  const isAdmin = auth.user?.role === "ADMIN";
  const transitions = isAdmin ? ADMIN_TRANSITIONS : SUPERVISOR_TRANSITIONS;

  // ⭐ Key fix: use a ref to track the dragging card
  // so the drop handler always has access to it regardless of dataTransfer
  const draggingCardRef = useRef<RequestColumn | null>(null);

  const [draggingCard, setDraggingCard] = useState<RequestColumn | null>(null);
  const [dropTarget, setDropTarget]     = useState<RequestStatus | null>(null);
  const [editingCard, setEditingCard]   = useState<RequestColumn | null>(null);

  const updateRequest = useUpdateRequest();
  const closeRequest  = useCloseRequest();

  function isValidDrop(from: RequestStatus, to: RequestStatus): boolean {
    return !!transitions[from]?.includes(to);
  }

  function handleCardDragStart(card: RequestColumn, e: React.DragEvent) {
    // Store in ref — guaranteed to be available in drop handler
    draggingCardRef.current = card;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("cardId", card.id);
    setDraggingCard(card);
  }

  function handleCardDragEnd() {
    draggingCardRef.current = null;
    setDraggingCard(null);
    setDropTarget(null);
  }

  function handleDrop(e: React.DragEvent, toStatus: RequestStatus) {
    e.preventDefault();

    // Use ref — always reliable, unlike dataTransfer in some browsers
    const card = draggingCardRef.current;

    draggingCardRef.current = null;
    setDraggingCard(null);
    setDropTarget(null);

    if (!card) return;
    if (!isValidDrop(card.status, toStatus)) return;
    if (card.status === toStatus) return;

    updateRequest.mutate({
      id: card.id,
      data: {
        status: toStatus,
        requestType: card.requestType,
        employee: card.employee.matricule,
        comment: card.comment || undefined,
      },
    });
  }

  function handleDownload(card: RequestColumn) {
    // TODO: trigger your PDF generation here before closing
    closeRequest.mutate(card.id);
  }

  function getDragOverState(colId: RequestStatus): "valid" | "invalid" | null {
    if (dropTarget !== colId || !draggingCard) return null;
    return isValidDrop(draggingCard.status, colId) ? "valid" : "invalid";
  }

  const grouped = ALL_COLUMNS.reduce<Record<RequestStatus, RequestColumn[]>>(
    (acc, col) => {
      acc[col.id] = data.filter((c) => c.status === col.id);
      return acc;
    },
    {} as Record<RequestStatus, RequestColumn[]>
  );

  return (
    <>
      {editingCard && (
        <SaveRequestModal
          requestId={editingCard.id}
          isOpen
          onClose={() => setEditingCard(null)}
        />
      )}

      <div
        className="grid gap-3 overflow-x-auto pb-4 pt-1"
        style={{ gridTemplateColumns: `repeat(${ALL_COLUMNS.length}, minmax(210px, 1fr))` }}
      >
        {ALL_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            cards={grouped[col.id] ?? []}
            dragOverState={getDragOverState(col.id)}
            onDragOver={() => setDropTarget(col.id)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => handleDrop(e, col.id)}
            onEdit={setEditingCard}
            onDownload={handleDownload}
            draggingId={draggingCard?.id ?? null}
            isAdmin={isAdmin}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
          />
        ))}
      </div>
    </>
  );
}