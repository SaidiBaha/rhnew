import { useState, useMemo, useEffect } from "react";
import { Pencil, Trash2, Plus, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import axios from "axios";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { Loader } from "@/components/Loader";
import { useFetchJobTitles } from "@/modules/job-title/hooks/useFetchJobTitles";
import { useCreateJobTitle } from "@/modules/job-title/hooks/useCreateJobTitle";
import { useUpdateJobTitle } from "@/modules/job-title/hooks/useUpdateJobTitle";
import { useDeleteJobTitle } from "@/modules/job-title/hooks/useDeleteJobTitle";
import type { JobTitle } from "@/modules/job-title/types";

const PAGE_SIZE = 10;

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
  initial?: JobTitle;
  onClose: () => void;
  onSave: (title: string) => void;
  loading: boolean;
}

function FormModal({ initial, onClose, onSave, loading }: FormModalProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Ce champ est obligatoire");
      return;
    }
    setError("");
    onSave(title.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--white)", border: "1px solid var(--border)" }}
      >
        <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--text)" }}>
          {initial ? "Modifier le poste" : "Nouveau poste occupé"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
              Libellé <span style={{ color: "var(--accent4)" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="Ex : OPERATEUR DE PRODUCTION"
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
export function JobTitleClient() {
  const { data: jobTitles, isLoading } = useFetchJobTitles();
  const createMutation = useCreateJobTitle();
  const updateMutation = useUpdateJobTitle();
  const deleteMutation = useDeleteJobTitle();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobTitle | undefined>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [search]);

  const openCreate = () => { setEditTarget(undefined); setModalOpen(true); };
  const openEdit = (jt: JobTitle) => { setEditTarget(jt); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const filtered = useMemo(() => {
    if (!jobTitles) return [];
    const q = search.toLowerCase().trim();
    if (!q) return jobTitles;
    return jobTitles.filter((jt) => jt.title.toLowerCase().includes(q));
  }, [jobTitles, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  const handleSave = (title: string) => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data: { title } },
        {
          onSuccess: () => { toast.success("Poste modifié"); closeModal(); },
          onError: (err) => toast.error(extractErrorMessage(err)),
        }
      );
    } else {
      createMutation.mutate(
        { title },
        {
          onSuccess: () => { toast.success("Poste créé"); closeModal(); },
          onError: (err) => toast.error(extractErrorMessage(err)),
        }
      );
    }
  };

  const handleDelete = async (jt: JobTitle) => {
    const result = await Swal.fire({
      title: "Supprimer ce poste ?",
      text: `"${jt.title}" sera définitivement supprimé.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#f03e3e",
    });
    if (!result.isConfirmed) return;
    deleteMutation.mutate(jt.id, {
      onSuccess: () => toast.success("Poste supprimé"),
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Postes Occupés"
          description="Gérer les postes occupés (intitulés de fonction)"
        />
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <Plus className="h-4 w-4" />
          Nouveau poste
        </button>
      </div>

      <Separator />

      {/* Barre de recherche */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: "var(--white)", border: "1px solid var(--border)", maxWidth: 320 }}
      >
        <Search className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par libellé…"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text)" }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ color: "var(--muted)" }}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--border)", background: "var(--white)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>ID</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Libellé</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Créé le</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Modifié le</th>
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text2)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                      {search ? `Aucun résultat pour « ${search} »` : "Aucun poste enregistré"}
                    </td>
                  </tr>
                ) : (
                  paginated.map((jt, i) => (
                    <tr
                      key={jt.id}
                      style={{
                        borderBottom: i < paginated.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                      className="transition-colors hover:bg-[var(--bg)]"
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>{jt.id}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{jt.title}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                        {jt.createdAt ? new Date(jt.createdAt).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                        {jt.updatedAt ? new Date(jt.updatedAt).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(jt)}
                            title="Modifier"
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                            style={{ color: "var(--accent)" }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(jt)}
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {filtered.length === 0
                ? "Aucun résultat"
                : `${rangeStart}–${rangeEnd} sur ${filtered.length} résultat${filtered.length !== 1 ? "s" : ""}`}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                title="Page précédente"
                className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => Math.abs(i - page) <= 2)
                .map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium transition-colors"
                    style={{
                      background: i === page ? "var(--accent)" : "var(--white)",
                      border: `1px solid ${i === page ? "var(--accent)" : "var(--border)"}`,
                      color: i === page ? "#fff" : "var(--text2)",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                title="Page suivante"
                className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
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
