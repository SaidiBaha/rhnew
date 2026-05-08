import { useState } from "react";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import type { SaveTemplateRequest } from "@/modules/checklist/types";

interface Props {
  initial?: {
    title: string;
    description?: string;
    categories: {
      id?: number;
      name: string;
      items: { id?: number; label: string }[];
    }[];
  };
  onSave: (data: SaveTemplateRequest) => void;
  onClose: () => void;
  loading: boolean;
}

type LocalCategory = {
  id?: number;
  name: string;
  items: { id?: number; label: string }[];
};

export function TemplateBuilder({ initial, onSave, onClose, loading }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categories, setCategories] = useState<LocalCategory[]>(
    initial?.categories.map((c) => ({ ...c, items: [...c.items] })) ?? []
  );
  const [error, setError] = useState("");

  const addCategory = () => setCategories((prev) => [...prev, { name: "", items: [] }]);
  const removeCategory = (ci: number) => setCategories((prev) => prev.filter((_, i) => i !== ci));
  const updateCategoryName = (ci: number, name: string) =>
    setCategories((prev) => prev.map((c, i) => (i === ci ? { ...c, name } : c)));

  const addItem = (ci: number) =>
    setCategories((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, items: [...c.items, { label: "" }] } : c))
    );
  const removeItem = (ci: number, ii: number) =>
    setCategories((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c))
    );
  const updateItem = (ci: number, ii: number, label: string) =>
    setCategories((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, items: c.items.map((item, j) => (j === ii ? { ...item, label } : item)) } : c
      )
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Le titre est obligatoire"); return; }
    setError("");
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      categories: categories.map((cat, ci) => ({
        id: cat.id,
        name: cat.name,
        orderIndex: ci,
        items: cat.items.map((item, ii) => ({
          id: item.id,
          label: item.label,
          orderIndex: ii,
        })),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--white)", border: "1px solid var(--border)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {initial ? "Modifier le modèle" : "Nouveau modèle de checklist"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Titre */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Titre <span style={{ color: "var(--accent4)" }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(""); }}
                placeholder="Ex : Checklist Gemba Walk HSE"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ border: error ? "1px solid var(--accent4)" : "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
              />
              {error && <p className="mt-1 text-xs" style={{ color: "var(--accent4)" }}>{error}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Description optionnelle…"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
                style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
              />
            </div>

            {/* Catégories */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Catégories ({categories.length})
                </span>
                <button
                  type="button"
                  onClick={addCategory}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Catégorie
                </button>
              </div>

              <div className="space-y-3">
                {categories.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>
                    Aucune catégorie — cliquez sur "Catégorie" pour en ajouter.
                  </p>
                )}
                {categories.map((cat, ci) => (
                  <div
                    key={ci}
                    className="rounded-xl p-4 space-y-3"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    {/* Nom catégorie */}
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} />
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => updateCategoryName(ci, e.target.value)}
                        placeholder="Nom de la catégorie (ex: Dangers physiques)"
                        className="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold outline-none"
                        style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeCategory(ci)}
                        className="rounded-lg p-1.5 hover:bg-red-50 transition-colors"
                        style={{ color: "var(--accent4)" }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Items */}
                    <div className="ml-6 space-y-2">
                      {cat.items.map((item, ii) => (
                        <div key={ii} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => updateItem(ci, ii, e.target.value)}
                            placeholder="Point à vérifier…"
                            className="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
                            style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--white)" }}
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(ci, ii)}
                            className="p-1 rounded hover:bg-red-50 transition-colors"
                            style={{ color: "var(--muted)" }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addItem(ci)}
                        className="flex items-center gap-1 text-xs font-medium mt-1 px-2 py-1 rounded-lg transition-colors hover:bg-[var(--accent-light)]"
                        style={{ color: "var(--accent)" }}
                      >
                        <Plus className="h-3 w-3" />
                        Ajouter un point
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
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
