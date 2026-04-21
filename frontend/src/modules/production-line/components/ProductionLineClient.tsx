import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import axios from "axios";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { Loader } from "@/components/Loader";
import { useFetchProductionLinesAdmin } from "@/modules/production-line/hooks/useFetchProductionLinesAdmin";
import { useCreateProductionLine } from "@/modules/production-line/hooks/useCreateProductionLine";
import { useUpdateProductionLine } from "@/modules/production-line/hooks/useUpdateProductionLine";
import { useDeleteProductionLine } from "@/modules/production-line/hooks/useDeleteProductionLine";
import type { ProductionLine } from "@/modules/production-line/types";

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.message) return data.message;
    if (typeof data === "string") return data;
  }
  if (err instanceof Error) return err.message;
  return "Une erreur est survenue";
}

/* ─── Form Modal ─────────────────────────────────────────── */
interface FormModalProps {
  initial?: ProductionLine;
  onClose: () => void;
  onSave: (name: string) => void;
  loading: boolean;
}

function FormModal({ initial, onClose, onSave, loading }: FormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ce champ est obligatoire");
      return;
    }
    setError("");
    onSave(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--white)", border: "1px solid var(--border)" }}
      >
        <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--text)" }}>
          {initial ? "Modifier la ligne de production" : "Nouvelle ligne de production"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
              Nom <span style={{ color: "var(--accent4)" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Ex : LIGNE A"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2"
              style={{
                border: error ? "1px solid var(--accent4)" : "1px solid var(--border)",
                color: "var(--text)",
                background: "var(--bg)",
              }}
            />
            {error && (
              <p className="mt-1 text-xs" style={{ color: "var(--accent4)" }}>{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
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

/* ─── Main Client ─────────────────────────────────────────── */
export function ProductionLineClient() {
  const { data: lines, isLoading } = useFetchProductionLinesAdmin();
  const createMutation = useCreateProductionLine();
  const updateMutation = useUpdateProductionLine();
  const deleteMutation = useDeleteProductionLine();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductionLine | undefined>();

  const openCreate = () => { setEditTarget(undefined); setModalOpen(true); };
  const openEdit = (line: ProductionLine) => { setEditTarget(line); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = (name: string) => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data: { name } },
        {
          onSuccess: () => { toast.success("Ligne modifiée"); closeModal(); },
          onError: (err) => toast.error(extractErrorMessage(err)),
        }
      );
    } else {
      createMutation.mutate(
        { name },
        {
          onSuccess: () => { toast.success("Ligne créée"); closeModal(); },
          onError: (err) => toast.error(extractErrorMessage(err)),
        }
      );
    }
  };

  const handleDelete = async (line: ProductionLine) => {
    const result = await Swal.fire({
      title: "Supprimer cette ligne ?",
      text: `"${line.name}" sera définitivement supprimée.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#f03e3e",
    });
    if (!result.isConfirmed) return;
    deleteMutation.mutate(line.id, {
      onSuccess: () => toast.success("Ligne supprimée"),
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Lignes de Production"
          description="Gérer les lignes de production"
        />
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <Plus className="h-4 w-4" />
          Nouvelle ligne
        </button>
      </div>

      <Separator />

      {isLoading ? (
        <Loader />
      ) : (
        <div
          className="overflow-hidden rounded-2xl"
          style={{ border: "1px solid var(--border)", background: "var(--white)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>ID</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Nom</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Créé le</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Modifié le</th>
                <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text2)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!lines || lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                    Aucune ligne de production enregistrée
                  </td>
                </tr>
              ) : (
                lines.map((line, i) => (
                  <tr
                    key={line.id}
                    style={{
                      borderBottom: i < lines.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                    className="transition-colors hover:bg-[var(--bg)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>{line.id}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{line.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                      {line.createdAt ? new Date(line.createdAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                      {line.updatedAt ? new Date(line.updatedAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(line)}
                          title="Modifier"
                          className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                          style={{ color: "var(--accent)" }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(line)}
                          title="Supprimer"
                          className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                          style={{ color: "var(--accent4)" }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <FormModal
          initial={editTarget}
          onClose={closeModal}
          onSave={handleSave}
          loading={isMutating}
        />
      )}
    </div>
  );
}
