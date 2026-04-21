import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import axios from "axios";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { Loader } from "@/components/Loader";
import { useFetchDepartments } from "@/modules/department/hooks/useFetchDepartments";
import { useCreateDepartment } from "@/modules/department/hooks/useCreateDepartment";
import { useUpdateDepartment } from "@/modules/department/hooks/useUpdateDepartment";
import { useDeleteDepartment } from "@/modules/department/hooks/useDeleteDepartment";
import type { Department } from "@/modules/department/types";

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
  initial?: Department;
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
          {initial ? "Modifier le département" : "Nouveau département"}
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
              placeholder="Ex : ASSEMBLAGE"
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
export function DepartmentClient() {
  const { data: departments, isLoading } = useFetchDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | undefined>();

  const openCreate = () => { setEditTarget(undefined); setModalOpen(true); };
  const openEdit = (dept: Department) => { setEditTarget(dept); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = (name: string) => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data: { name } },
        {
          onSuccess: () => { toast.success("Département modifié"); closeModal(); },
          onError: (err) => toast.error(extractErrorMessage(err)),
        }
      );
    } else {
      createMutation.mutate(
        { name },
        {
          onSuccess: () => { toast.success("Département créé"); closeModal(); },
          onError: (err) => toast.error(extractErrorMessage(err)),
        }
      );
    }
  };

  const handleDelete = async (dept: Department) => {
    const result = await Swal.fire({
      title: "Supprimer ce département ?",
      text: `"${dept.name}" sera définitivement supprimé.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#f03e3e",
    });
    if (!result.isConfirmed) return;
    deleteMutation.mutate(dept.id, {
      onSuccess: () => toast.success("Département supprimé"),
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Départements"
          description="Gérer les départements de l'entreprise"
        />
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <Plus className="h-4 w-4" />
          Nouveau département
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
              {!departments || departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                    Aucun département enregistré
                  </td>
                </tr>
              ) : (
                departments.map((dept, i) => (
                  <tr
                    key={dept.id}
                    style={{
                      borderBottom: i < departments.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                    className="transition-colors hover:bg-[var(--bg)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>{dept.id}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{dept.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                      {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                      {dept.updatedAt ? new Date(dept.updatedAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(dept)}
                          title="Modifier"
                          className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                          style={{ color: "var(--accent)" }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
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
