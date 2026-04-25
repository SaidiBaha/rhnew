import { useState, useMemo, useCallback } from "react";
import { Plus, CheckSquare, XSquare } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { DataTable } from "@/components/ui/DataTable";
import { getColumns, type RequestColumn } from "@/modules/request/components/columns";
import { SaveRequestModal } from "@/modules/request/components/SaveRequestModal";
import { useUpdateRequestStatus } from "@/modules/request/hooks/useUpdateRequestStatus";
import { useBulkUpdateRequestStatus } from "@/modules/request/hooks/useBulkUpdateRequestStatus";
import useAuth from "@/hooks/useAuth";
import type { RequestStatus } from "@/modules/request/types";

interface RequestsClientProps {
  data: RequestColumn[];
}

export function RequestsClient({ data }: RequestsClientProps) {
  const { auth } = useAuth();
  const isAdminOrSuperAdmin =
    auth?.user?.role === "ADMIN" || auth?.user?.role === "SUPER_ADMIN";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updateStatus = useUpdateRequestStatus();
  const bulkUpdate = useBulkUpdateRequestStatus();

  /* ── Selection helpers ── */
  const allSelected = data.length > 0 && data.every((r) => selectedIds.has(r.id));
  const someSelected = data.some((r) => selectedIds.has(r.id)) && !allSelected;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => r.id)));
    }
  }, [allSelected, data]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /* ── Quick status (individual row) ── */
  const handleQuickStatus = useCallback(
    async (id: string, status: RequestStatus) => {
      const label = status === "TRAITÉ" ? "traité" : "annulé";
      const color = status === "TRAITÉ" ? "#00c48c" : "#f03e3e";
      const result = await Swal.fire({
        title: `Marquer comme ${label} ?`,
        text: "Cette action va modifier le statut de la demande.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Confirmer",
        cancelButtonText: "Annuler",
        confirmButtonColor: color,
      });
      if (!result.isConfirmed) return;
      updateStatus.mutate(
        { id, status },
        {
          onSuccess: () => toast.success(`Demande marquée comme ${label}`),
          onError: () => toast.error("Erreur lors de la mise à jour"),
        }
      );
    },
    [updateStatus]
  );

  /* ── Bulk status ── */
  const handleBulkStatus = async (status: RequestStatus) => {
    const ids = Array.from(selectedIds);
    const label = status === "TRAITÉ" ? "traité" : "annulé";
    const color = status === "TRAITÉ" ? "#00c48c" : "#f03e3e";
    const result = await Swal.fire({
      title: `Modifier ${ids.length} demande(s) ?`,
      text: `Vous allez marquer ${ids.length} demande(s) comme ${label}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirmer",
      cancelButtonText: "Annuler",
      confirmButtonColor: color,
    });
    if (!result.isConfirmed) return;
    bulkUpdate.mutate(
      { ids, status },
      {
        onSuccess: (res) => {
          const { updated, skipped } = res.data;
          if (skipped > 0) {
            toast.success(
              `${updated} mise(s) à jour réussie(s), ${skipped} ignorée(s) (déjà finalisée(s))`,
              { duration: 5000 }
            );
          } else {
            toast.success(`${updated} demande(s) mise(s) à jour`);
          }
          clearSelection();
        },
        onError: () => toast.error("Erreur lors de la mise à jour en masse"),
      }
    );
  };

  /* ── Column definitions (memoized) ── */
  const columns = useMemo(
    () =>
      getColumns({
        isAdminOrSuperAdmin,
        selectedIds,
        onToggle: toggleSelect,
        isAllSelected: allSelected,
        isIndeterminate: someSelected,
        onToggleAll: toggleAll,
        onQuickStatus: handleQuickStatus,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdminOrSuperAdmin, selectedIds, allSelected, someSelected]
  );

  return (
    <>
      <SaveRequestModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <div className="flex items-center justify-between">
        <Heading
          title={`Demandes (${data.length})`}
          description="Gérer les demandes."
        />
        <div className="flex items-center justify-center gap-x-4">
          <button
            type="button"
            className="ds-btn-primary"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="size-4" />
            Ajouter
          </button>
        </div>
      </div>

      <Separator />

      {/* ── Bulk action bar ── */}
      {isAdminOrSuperAdmin && selectedIds.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-2.5"
          style={{
            background: "var(--accent-light)",
            border: "1px solid var(--accent)",
          }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            {selectedIds.size} requête(s) sélectionnée(s)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkStatus("TRAITÉ")}
              disabled={bulkUpdate.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent2)" }}
            >
              <CheckSquare className="h-4 w-4" />
              Marquer traité
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus("ANNULÉ")}
              disabled={bulkUpdate.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent4)" }}
            >
              <XSquare className="h-4 w-4" />
              Marquer annulé
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        globalFilterFn="includesString"
        showExport
      />
    </>
  );
}
