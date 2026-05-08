import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, Trash2, Eye, Search, X, ChevronLeft, ChevronRight, ClipboardList, LayoutTemplate, FileText } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import axios from "axios";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { Loader } from "@/components/Loader";
import useAuth from "@/hooks/useAuth";
import { useFetchTemplates } from "@/modules/checklist/hooks/useFetchTemplates";
import { useFetchTemplateById } from "@/modules/checklist/hooks/useFetchTemplateById";
import { useCreateTemplate } from "@/modules/checklist/hooks/useCreateTemplate";
import { useUpdateTemplate } from "@/modules/checklist/hooks/useUpdateTemplate";
import { useDeleteTemplate } from "@/modules/checklist/hooks/useDeleteTemplate";
import { useFetchInstances } from "@/modules/checklist/hooks/useFetchInstances";
import { useFetchInstanceById } from "@/modules/checklist/hooks/useFetchInstanceById";
import { useCreateInstance } from "@/modules/checklist/hooks/useCreateInstance";
import { useUpdateInstance } from "@/modules/checklist/hooks/useUpdateInstance";
import { TemplateBuilder } from "./TemplateBuilder";
import { ChecklistFillForm } from "./ChecklistFillForm";
import { ChecklistDetailModal } from "./ChecklistDetailModal";
import type { ChecklistTemplateSummary, ChecklistInstance } from "@/modules/checklist/types";

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

type Tab = "templates" | "instances";

export function ChecklistClient() {
  const { auth } = useAuth();
  const role = auth?.user?.role;
  const canWrite = role === "INGENIEUR_HSE";

  const [tab, setTab] = useState<Tab>("templates");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Templates
  const { data: templates, isLoading: loadingTemplates } = useFetchTemplates();
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const deleteTemplateMutation = useDeleteTemplate();

  const [templateModal, setTemplateModal] = useState<"create" | "edit" | null>(null);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const { data: editTemplateData, isLoading: loadingEditTemplate } = useFetchTemplateById(
    templateModal === "edit" ? editTemplateId : null
  );

  // Instances
  const [instancesPage, setInstancesPage] = useState(0);
  const { data: instancesData, isLoading: loadingInstances } = useFetchInstances(instancesPage, PAGE_SIZE);
  const createInstanceMutation = useCreateInstance();
  const updateInstanceMutation = useUpdateInstance();

  const [instanceModal, setInstanceModal] = useState<"create" | "edit" | null>(null);
  const [fillTemplateId, setFillTemplateId] = useState<number | null>(null);
  const [editInstanceId, setEditInstanceId] = useState<number | null>(null);
  const [detailInstanceId, setDetailInstanceId] = useState<number | null>(null);
  const { data: fillTemplateData } = useFetchTemplateById(fillTemplateId);
  const { data: editInstanceData } = useFetchInstanceById(
    instanceModal === "edit" ? editInstanceId : null
  );
  const { data: editInstanceTemplate } = useFetchTemplateById(
    instanceModal === "edit" && editInstanceData ? editInstanceData.templateId ?? null : null
  );

  useEffect(() => { setPage(0); }, [search]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    const q = search.toLowerCase().trim();
    if (!q) return templates;
    return templates.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }, [templates, search]);

  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
  const paginatedTemplates = filteredTemplates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDeleteTemplate = async (t: ChecklistTemplateSummary) => {
    const result = await Swal.fire({
      title: "Supprimer ce modèle ?",
      text: `"${t.title}" sera définitivement supprimé.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#f03e3e",
    });
    if (!result.isConfirmed) return;
    deleteTemplateMutation.mutate(t.id, {
      onSuccess: () => toast.success("Modèle supprimé"),
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  const handleViewInstance = async (inst: ChecklistInstance) => {
    setEditInstanceId(inst.id);
    setInstanceModal("edit");
  };

  const handleDetailInstance = (inst: ChecklistInstance) => {
    setDetailInstanceId(inst.id);
  };

  const statusBadge = (status: ChecklistInstance["status"]) => (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        background: status === "COMPLETE" ? "rgba(0,196,140,0.12)" : "rgba(255,140,0,0.12)",
        color: status === "COMPLETE" ? "var(--accent2)" : "var(--accent3)",
      }}
    >
      {status === "COMPLETE" ? "Complète" : "Brouillon"}
    </span>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Checklists HSE" description="Gestion des modèles et des checklists remplies" />
        {canWrite && tab === "templates" && (
          <button
            onClick={() => setTemplateModal("create")}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            <Plus className="h-4 w-4" />
            Nouveau modèle
          </button>
        )}
        {canWrite && tab === "instances" && (
          <button
            onClick={() => {
              setFillTemplateId(null);
              setInstanceModal("create");
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            <Plus className="h-4 w-4" />
            Remplir une checklist
          </button>
        )}
      </div>

      <Separator />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        {([["templates", "Modèles", LayoutTemplate], ["instances", "Checklists remplies", ClipboardList]] as const).map(
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

      {/* Search (templates tab) */}
      {tab === "templates" && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "var(--white)", border: "1px solid var(--border)", maxWidth: 320 }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un modèle…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ color: "var(--muted)" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ─── Templates Tab ─────────────────────────────────────────── */}
      {tab === "templates" && (
        loadingTemplates ? <Loader /> : (
          <>
            <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--white)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Titre</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Description</th>
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--text2)" }}>Catégories</th>
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--text2)" }}>Points</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Créé le</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text2)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                        {search ? `Aucun résultat pour « ${search} »` : "Aucun modèle de checklist"}
                      </td>
                    </tr>
                  ) : paginatedTemplates.map((t, i) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: i < paginatedTemplates.length - 1 ? "1px solid var(--border)" : "none" }}
                      className="transition-colors hover:bg-[var(--bg)]"
                    >
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{t.title}</td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--text2)" }}>{t.description || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                          {t.categoryCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                          {t.itemCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canWrite && (
                            <>
                              <button
                                onClick={() => { setEditTemplateId(t.id); setTemplateModal("edit"); }}
                                title="Modifier"
                                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                                style={{ color: "var(--accent)" }}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(t)}
                                title="Supprimer"
                                className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                                style={{ color: "var(--accent4)" }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => { setFillTemplateId(t.id); setTab("instances"); setInstanceModal("create"); }}
                              title="Remplir une checklist"
                              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                              style={{ color: "var(--accent2)" }}
                            >
                              <ClipboardList className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-1">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {filteredTemplates.length === 0 ? "Aucun résultat" :
                  `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredTemplates.length)} sur ${filteredTemplates.length}`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                  style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalTemplatePages }, (_, i) => i)
                  .filter((i) => Math.abs(i - page) <= 2)
                  .map((i) => (
                    <button
                      key={i}
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
                  onClick={() => setPage((p) => Math.min(totalTemplatePages - 1, p + 1))}
                  disabled={page >= totalTemplatePages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                  style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )
      )}

      {/* ─── Instances Tab ─────────────────────────────────────────── */}
      {tab === "instances" && (
        loadingInstances ? <Loader /> : (
          <>
            <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--white)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Modèle</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Date</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Ligne / Unité</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Auditeur</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Statut</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text2)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!instancesData?.content || instancesData.content.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                        Aucune checklist remplie
                      </td>
                    </tr>
                  ) : instancesData.content.map((inst, i) => (
                    <tr
                      key={inst.id}
                      style={{ borderBottom: i < instancesData.content.length - 1 ? "1px solid var(--border)" : "none" }}
                      className="transition-colors hover:bg-[var(--bg)]"
                    >
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{inst.templateTitle || "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                        {inst.date ? new Date(inst.date).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text2)" }}>{inst.lineUnit || "—"}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text2)" }}>{inst.auditor || "—"}</td>
                      <td className="px-4 py-3">{statusBadge(inst.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDetailInstance(inst)}
                            title="Voir les détails"
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                            style={{ color: "var(--accent2)" }}
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          {canWrite && (
                            <button
                              onClick={() => handleViewInstance(inst)}
                              title="Modifier"
                              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                              style={{ color: "var(--accent)" }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {!canWrite && (
                            <button
                              onClick={() => handleViewInstance(inst)}
                              title="Voir"
                              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                              style={{ color: "var(--accent)" }}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination instances */}
            {instancesData && instancesData.totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {`Page ${instancesPage + 1} sur ${instancesData.totalPages} — ${instancesData.totalElements} résultat(s)`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setInstancesPage((p) => Math.max(0, p - 1))}
                    disabled={instancesData.first}
                    className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                    style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstancesPage((p) => Math.min(instancesData.totalPages - 1, p + 1))}
                    disabled={instancesData.last}
                    className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                    style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* ─── Template Builder Modal ─── */}
      {templateModal === "create" && (
        <TemplateBuilder
          onSave={(data) => {
            createTemplateMutation.mutate(data, {
              onSuccess: () => { toast.success("Modèle créé"); setTemplateModal(null); },
              onError: (err) => toast.error(extractErrorMessage(err)),
            });
          }}
          onClose={() => setTemplateModal(null)}
          loading={createTemplateMutation.isPending}
        />
      )}

      {templateModal === "edit" && editTemplateData && !loadingEditTemplate && (
        <TemplateBuilder
          initial={editTemplateData}
          onSave={(data) => {
            updateTemplateMutation.mutate(
              { id: editTemplateData.id, data },
              {
                onSuccess: () => { toast.success("Modèle modifié"); setTemplateModal(null); },
                onError: (err) => toast.error(extractErrorMessage(err)),
              }
            );
          }}
          onClose={() => setTemplateModal(null)}
          loading={updateTemplateMutation.isPending}
        />
      )}
      {templateModal === "edit" && loadingEditTemplate && <Loader />}

      {/* ─── Checklist Fill Modal ─── */}
      {instanceModal === "create" && fillTemplateId && fillTemplateData && (
        <ChecklistFillForm
          template={fillTemplateData}
          onSave={(data) => {
            createInstanceMutation.mutate(data, {
              onSuccess: () => { toast.success("Checklist enregistrée"); setInstanceModal(null); setFillTemplateId(null); },
              onError: (err) => toast.error(extractErrorMessage(err)),
            });
          }}
          onClose={() => { setInstanceModal(null); setFillTemplateId(null); }}
          loading={createInstanceMutation.isPending}
        />
      )}
      {instanceModal === "create" && !fillTemplateId && (
        /* Template selector when opening from the "Remplir" button with no template pre-selected */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--white)", border: "1px solid var(--border)" }}
          >
            <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--text)" }}>
              Choisir un modèle
            </h2>
            {loadingTemplates ? <Loader /> : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates?.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFillTemplateId(t.id)}
                    className="w-full rounded-xl px-4 py-3 text-left transition-colors hover:bg-[var(--bg)]"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>{t.title}</div>
                    {t.description && <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{t.description}</div>}
                  </button>
                ))}
                {(!templates || templates.length === 0) && (
                  <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>
                    Aucun modèle disponible — créez-en un d'abord.
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => setInstanceModal(null)}
              className="mt-4 w-full rounded-lg py-2 text-sm font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {instanceModal === "edit" && editInstanceData && editInstanceTemplate && canWrite && (
        <ChecklistFillForm
          template={editInstanceTemplate}
          initial={editInstanceData}
          onSave={(data) => {
            updateInstanceMutation.mutate(
              { id: editInstanceData.id, data },
              {
                onSuccess: () => { toast.success("Checklist mise à jour"); setInstanceModal(null); setEditInstanceId(null); },
                onError: (err) => toast.error(extractErrorMessage(err)),
              }
            );
          }}
          onClose={() => { setInstanceModal(null); setEditInstanceId(null); }}
          loading={updateInstanceMutation.isPending}
        />
      )}

      {/* ─── Checklist Detail Modal ─── */}
      {detailInstanceId !== null && (
        <ChecklistDetailModal
          instanceId={detailInstanceId}
          onClose={() => setDetailInstanceId(null)}
        />
      )}
    </div>
  );
}
