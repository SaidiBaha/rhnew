import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Search, Upload, X,
  CheckCircle, XCircle, Pencil, Trash2, PlusCircle, Clock, Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import { Loader } from "@/components/Loader";
import useAuth from "@/hooks/useAuth";

import { useFetchAbsencesPaged } from "@/modules/absence/hooks/useFetchAbsencesPaged";
import { useUpdateAbsence } from "@/modules/absence/hooks/useUpdateAbsence";
import { useDeleteAbsence } from "@/modules/absence/hooks/useDeleteAbsence";
import { useBatchSaveAbsences } from "@/modules/absence/hooks/useBatchSaveAbsences";
import { useSaveAbsence } from "@/modules/absence/hooks/useSaveAbsence";
import { parseAbsenceRow } from "@/modules/absence/utils";

import type { Absence, AbsenceFilters, AbsenceStatut, SaveAbsenceInput, UpdateAbsenceInput } from "@/modules/absence/types";
import type { UserRole } from "@/modules/auth/types";

const PAGE_SIZE = 25;
const TODAY = new Date().toISOString().split("T")[0];

type BackendErrorDto = { code?: string | number; message?: string; errors?: string[] };
function extractAxiosError(err: unknown) {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<BackendErrorDto>;
    const d = e.response?.data;
    return { status: e.response?.status, message: d?.message ?? e.message ?? "Erreur API", errors: d?.errors ?? [] };
  }
  if (err instanceof Error) return { message: err.message, errors: [] };
  return { message: "Erreur inattendue", errors: [] };
}

function computeStatut(a: Absence): "PRESENT" | "ABSENT" | "PENDING" {
  if (a.heureEntree) return "PRESENT";
  if (a.date === TODAY && a.heureDebut) {
    const now = new Date();
    const [shiftH, shiftM] = a.heureDebut.split(":").map(Number);
    const shiftMinutes = shiftH * 60 + shiftM;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes < shiftMinutes) return "PENDING";
  }
  if (a.statut === "PRESENT") return "PRESENT";
  if (a.statut === "ABSENT") return "ABSENT";
  return "PENDING";
}

function StatutBadge({ statut }: { statut: "PRESENT" | "ABSENT" | "PENDING" }) {
  if (statut === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(156,163,175,0.15)", color: "var(--muted)" }}>
        <Clock className="size-3" /> Pas encore
      </span>
    );
  }
  if (statut === "ABSENT") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(240,62,62,0.1)", color: "var(--accent4)" }}>
        <XCircle className="size-3" /> Absent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: "rgba(0,196,140,0.1)", color: "var(--accent2)" }}>
      <CheckCircle className="size-3" /> Présent
    </span>
  );
}

interface ManualModalProps {
  onClose: () => void;
  onSubmit: (input: SaveAbsenceInput) => void;
  isLoading: boolean;
}
function ManualAbsenceModal({ onClose, onSubmit, isLoading }: ManualModalProps) {
  const [form, setForm] = useState<SaveAbsenceInput>({
    matricule: "", date: TODAY, horaire: "", heureDebut: "06:00",
    heureFin: "", heureEntree: "", heureSortie: "", motif: "", departement: "",
  });
  const set = (k: keyof SaveAbsenceInput, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl shadow-xl p-6 flex flex-col gap-4"
           style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Ajouter une absence</h3>
          <button onClick={onClose}><X className="size-5" style={{ color: "var(--muted)" }} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Matricule *", key: "matricule", type: "text" },
            { label: "Date *", key: "date", type: "date" },
            { label: "Horaire", key: "horaire", type: "text" },
            { label: "Heure Début", key: "heureDebut", type: "time" },
            { label: "Heure Fin", key: "heureFin", type: "time" },
            { label: "Heure Entrée", key: "heureEntree", type: "time" },
            { label: "Heure Sortie", key: "heureSortie", type: "time" },
            { label: "Département", key: "departement", type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>{label}</label>
              <input type={type} value={(form as Record<string, string>)[key] ?? ""}
                     onChange={e => set(key as keyof SaveAbsenceInput, e.target.value)}
                     className="h-9 rounded-lg border px-2 text-sm outline-none"
                     style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
          ))}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Motif</label>
            <input type="text" value={form.motif ?? ""}
                   onChange={e => set("motif", e.target.value)}
                   placeholder="RETARD, MALADIE, MISSION…"
                   className="h-9 rounded-lg border px-2 text-sm outline-none"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-sm border"
                  style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>Annuler</button>
          <button disabled={isLoading || !form.matricule || !form.date}
                  onClick={() => onSubmit(form)}
                  className="h-9 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--accent)" }}>
            {isLoading ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  absence: Absence;
  canEditMotif: boolean;
  canEditStatut: boolean;
  onClose: () => void;
  onSubmit: (dto: UpdateAbsenceInput) => void;
  isLoading: boolean;
}
function EditAbsenceModal({ absence, canEditMotif, canEditStatut, onClose, onSubmit, isLoading }: EditModalProps) {
  const [motif, setMotif] = useState(absence.motif ?? "");
  const [statut, setStatut] = useState<AbsenceStatut>(absence.statut ?? "ABSENT");
  const [heureEntree, setHeureEntree] = useState(
    absence.heureEntree?.slice(0, 5) ??
    (absence.horaire === "ADM" ? "08:00" : absence.horaire === "Shift Nuit" ? "14:00" : "06:00")
  );
  const [heureSortie, setHeureSortie] = useState(
    absence.heureSortie?.slice(0, 5) ??
    (absence.horaire === "ADM" ? "17:00" : absence.horaire === "Shift Nuit" ? "22:00" : "14:00")
  );
  const [confirm, setConfirm] = useState(false);

  function handleSubmit() {
    if (!confirm) { setConfirm(true); return; }
    onSubmit({
      motif: canEditMotif ? (motif || undefined) : undefined,
      statut: canEditStatut ? statut : undefined,
      heureEntree: heureEntree || undefined,
      heureSortie: heureSortie || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl shadow-xl p-6 flex flex-col gap-4"
           style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Modifier l'absence</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {absence.fullName} — {absence.date}
            </p>
          </div>
          <button onClick={onClose}><X className="size-5" style={{ color: "var(--muted)" }} /></button>
        </div>
        <div style={{ borderTop: "1px solid var(--border)" }} />
       <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>🕐 Heure d'entrée</label>
            <input type="text" value={heureEntree} onChange={e => setHeureEntree(e.target.value)}
                   placeholder="06:00" maxLength={5}
                   className="h-9 rounded-lg border px-3 text-sm outline-none text-center font-mono"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>🕐 Heure de sortie</label>
            <input type="text" value={heureSortie} onChange={e => setHeureSortie(e.target.value)}
                   placeholder="14:00" maxLength={5}
                   className="h-9 rounded-lg border px-3 text-sm outline-none text-center font-mono"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
        </div>
        {canEditMotif && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>Motif</label>
            <input type="text" value={motif} onChange={e => setMotif(e.target.value)}
                   placeholder="RETARD, MALADIE, MISSION…"
                   className="h-9 rounded-lg border px-2 text-sm outline-none"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
        )}
        {canEditStatut && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>Statut</label>
            <select value={statut} onChange={e => setStatut(e.target.value as AbsenceStatut)}
                    className="h-9 rounded-lg border px-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="ABSENT">❌ Absent</option>
              <option value="PRESENT">✅ Présent</option>
              <option value="PENDING">⏳ Pas encore</option>
            </select>
          </div>
        )}
        {confirm && (
          <div className="rounded-lg px-3 py-2 text-sm font-medium"
               style={{ background: "rgba(240,62,62,0.08)", color: "var(--accent4)", border: "1px solid rgba(240,62,62,0.2)" }}>
            ⚠️ Confirmer la modification pour <strong>{absence.fullName}</strong> ?
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => { setConfirm(false); onClose(); }}
                  className="h-9 px-4 rounded-lg text-sm border"
                  style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>
            Annuler
          </button>
          <button disabled={isLoading} onClick={handleSubmit}
                  className="h-9 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: confirm ? "var(--accent4)" : "var(--accent)" }}>
            {isLoading ? "Enregistrement…" : confirm ? "✅ Confirmer" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AbsencesClient() {
  const { auth } = useAuth();
  const role = auth.user?.role as UserRole | undefined;

  const isAdmin      = role === "ADMIN";
  const isSupervisor = role === "SUPERVISOR";
  const isInfirmiere = (role as string) === "INFIRMIERE";

  const canImport    = isAdmin || isSupervisor || isInfirmiere;
  const canAddManual = isAdmin || isSupervisor;
  const canEditMotif = isAdmin || isInfirmiere;
  const canEditStatut= isAdmin || isSupervisor;
  const canDelete    = isAdmin || isInfirmiere;

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterDateFrom,   setFilterDateFrom]   = useState(TODAY);
  const [filterDateTo,     setFilterDateTo]     = useState(TODAY);
  const [filterStatut,     setFilterStatut]     = useState<"PRESENT" | "ABSENT" | "PENDING" | "">("");
  const [filterSupervisor, setFilterSupervisor] = useState("");
  const [filterHoraire,    setFilterHoraire]    = useState("");

  const [isUploadOpen,    setIsUploadOpen]    = useState(false);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [isManualOpen,    setIsManualOpen]    = useState(false);
  const [editAbsence,     setEditAbsence]     = useState<Absence | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const filters: AbsenceFilters = {
    dateFrom:            filterDateFrom  || undefined,
    dateTo:              filterDateTo    || undefined,
    statut:              undefined,
    search:              search          || undefined,
    supervisorMatricule: filterSupervisor || undefined,
    horaire:             filterHoraire   || undefined,
  };

  const { data: pageData, isLoading, isFetching } = useFetchAbsencesPaged(page, PAGE_SIZE, filters);
  const updateAbsence = useUpdateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const batchSave     = useBatchSaveAbsences();
  const saveAbsence   = useSaveAbsence();

  const rawAbsences   = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages    = pageData?.totalPages ?? 1;
  const isFirst       = pageData?.first ?? true;
  const isLast        = pageData?.last ?? true;
  const hasFilters    = !!(
    (filterDateFrom && filterDateFrom !== TODAY) ||
    (filterDateTo   && filterDateTo   !== TODAY) ||
    filterStatut || filterSupervisor || filterHoraire
  );

  const withComputedStatut = rawAbsences.map(a => ({
    ...a,
    _displayStatut: computeStatut(a),
  }));

  const filtered = filterStatut
    ? withComputedStatut.filter(a => a._displayStatut === filterStatut)
    : withComputedStatut;

  const absences = [...filtered].sort((a, b) => {
    const aToday = a.date === TODAY;
    const bToday = b.date === TODAY;
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    const pendingOrder = (s: string) => s === "PENDING" ? 1 : 0;
    const pendingDiff = pendingOrder(a._displayStatut) - pendingOrder(b._displayStatut);
    if (pendingDiff !== 0) return pendingDiff;
    const aHour = a.heureDebut ? parseInt(a.heureDebut.split(":")[0]) : 99;
    const bHour = b.heureDebut ? parseInt(b.heureDebut.split(":")[0]) : 99;
    return aHour - bHour;
  });

  function resetFilters() {
    setFilterDateFrom(TODAY);
    setFilterDateTo(TODAY);
    setFilterStatut("");
    setFilterSupervisor("");
    setFilterHoraire("");
    setPage(0);
  }

  async function onImportSubmit(formData: { files: File[] }) {
    setIsUploadLoading(true);
    try {
      const file = formData.files[0];
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "buffer", cellDates: true, dateNF: "dd/mm/yyyy" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      const inputs = (rows as object[]).map(parseAbsenceRow).filter(r => r.matricule && r.date);
      if (inputs.length === 0) {
        toast.error("Aucune ligne valide trouvée — vérifiez les colonnes !");
        return;
      }
      await batchSave.mutateAsync(inputs);
      toast.success(`${inputs.length} absences importées ✅`, { duration: 4000 });
      setIsUploadOpen(false);
      setPage(0);
    } catch (err) {
      toast.error(extractAxiosError(err).message, { duration: 6000 });
    } finally {
      setIsUploadLoading(false);
    }
  }

  async function onManualSubmit(input: SaveAbsenceInput) {
    try {
      await saveAbsence.mutateAsync(input);
      toast.success("Absence enregistrée ✅");
      setIsManualOpen(false);
    } catch (err) {
      toast.error(extractAxiosError(err).message);
    }
  }

  async function onEditSubmit(dto: UpdateAbsenceInput) {
    if (!editAbsence) return;
    try {
      await updateAbsence.mutateAsync({ id: editAbsence.id, dto });
      toast.success("Absence mise à jour ✅");
      setEditAbsence(null);
    } catch (err) {
      toast.error(extractAxiosError(err).message);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Supprimer cette absence ?")) return;
    try {
      await deleteAbsence.mutateAsync(id);
      toast.success("Absence supprimée");
    } catch (err) {
      toast.error(extractAxiosError(err).message);
    }
  }

  function onExportExcel() {
    const rows = absences.map(a => ({
      "Matricule":  a.matricule,
      "Nom":        a.fullName,
      "Date":       a.date,
      "Horaire":    a.horaire ?? "",
      "Début":      a.heureDebut ?? "",
      "Fin":        a.heureFin ?? "",
      "Entrée":     a.heureEntree ?? "",
      "Sortie":     a.heureSortie ?? "",
      "Statut":     a._displayStatut === "PRESENT" ? "Présent" : a._displayStatut === "ABSENT" ? "Absent" : "Pas encore",
      "Motif":      a.motif ?? "",
      "Département": a.departement ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absences");
    XLSX.writeFile(wb, `absences_${filterDateFrom ?? TODAY}.xlsx`);
  }

  if (isLoading) return <Loader />;

  return (
    <>
      {isUploadOpen && (
        <FileUploadModal isOpen title="Importer absences" description="Fichier Excel des absences"
          onClose={() => setIsUploadOpen(false)}
          onSubmit={onImportSubmit as never}
          isLoading={isUploadLoading} />
      )}
      {isManualOpen && (
        <ManualAbsenceModal onClose={() => setIsManualOpen(false)}
          onSubmit={onManualSubmit} isLoading={saveAbsence.isPending} />
      )}
      {editAbsence && (
        <EditAbsenceModal absence={editAbsence}
          canEditMotif={canEditMotif} canEditStatut={canEditStatut}
          onClose={() => setEditAbsence(null)}
          onSubmit={onEditSubmit} isLoading={updateAbsence.isPending} />
      )}

      <div className="flex items-center justify-between">
        <Heading title={`Absences (${totalElements})`} description="Gestion des absences du personnel." />
        <div className="flex items-center gap-x-3">
          {canAddManual && (
            <button onClick={() => setIsManualOpen(true)}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold border transition-colors"
                    style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--bg)" }}>
              <PlusCircle className="size-4" /> Ajouter
            </button>
          )}
          {canImport && (
            <button onClick={onExportExcel}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold border transition-colors"
                    style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--bg)" }}>
              <Download className="size-4" /> Exporter Excel
            </button>
          )}
          {canImport && (
            <button onClick={() => setIsUploadOpen(true)}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "var(--accent)" }}>
              <Upload className="size-4" /> Importer Excel
            </button>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: "var(--muted)" }} />
          <input type="text" placeholder="Nom, matricule…" value={searchInput}
                 onChange={e => setSearchInput(e.target.value)}
                 className="pl-9 pr-8 h-9 w-full rounded-lg border text-sm outline-none"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          {searchInput && (
            <button onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--muted)" }}>
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>Chargement…</span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Du</label>
          <input type="date" value={filterDateFrom}
                 onChange={e => { setFilterDateFrom(e.target.value); setPage(0); }}
                 className="h-9 rounded-lg border px-2 text-sm outline-none"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 150 }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Au</label>
          <input type="date" value={filterDateTo}
                 onChange={e => { setFilterDateTo(e.target.value); setPage(0); }}
                 className="h-9 rounded-lg border px-2 text-sm outline-none"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 150 }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Statut</label>
          <select value={filterStatut}
                  onChange={e => { setFilterStatut(e.target.value as "PRESENT" | "ABSENT" | "PENDING" | ""); setPage(0); }}
                  className="h-9 rounded-lg border px-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 130 }}>
            <option value="">Tous</option>
            <option value="PRESENT">Présent</option>
            <option value="ABSENT">Absent</option>
            <option value="PENDING">Pas encore</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Shift</label>
          <select value={filterHoraire}
                  onChange={e => { setFilterHoraire(e.target.value); setPage(0); }}
                  className="h-9 rounded-lg border px-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 130 }}>
            <option value="">Tous</option>
            <option value="Shift matin">Shift matin</option>
            <option value="Shift Nuit">Shift Nuit</option>
            <option value="Shift APM">Shift APM</option>
            <option value="ADM">ADM</option>
          </select>
        </div>
        {(isAdmin || isInfirmiere) && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Superviseur</label>
            <input type="text" placeholder="Matricule superviseur…" value={filterSupervisor}
                   onChange={e => { setFilterSupervisor(e.target.value); setPage(0); }}
                   className="h-9 rounded-lg border px-2 text-sm outline-none"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 180 }} />
          </div>
        )}
        {hasFilters && (
          <button onClick={resetFilters}
                  className="h-9 flex items-center gap-1.5 px-3 rounded-lg border text-sm"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--accent4)" }}>
            <X className="size-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Matricule","Nom","Date","Horaire","Début","Fin","Entrée","Sortie","Statut","Motif","Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text2)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {absences.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                  Aucune absence trouvée
                </td>
              </tr>
            ) : absences.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>{a.matricule}</td>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{a.fullName}</td>
                <td className="px-4 py-3" style={{ color: "var(--text2)" }}>{a.date}</td>
                <td className="px-4 py-3" style={{ color: "var(--text2)" }}>{a.horaire ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>{a.heureDebut ?? "06:00"}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>{a.heureFin ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs"
                    style={{ color: a.heureEntree ? "var(--text)" : "var(--muted)" }}>
                  {a.heureEntree ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>{a.heureSortie ?? "—"}</td>
                <td className="px-4 py-3"><StatutBadge statut={a._displayStatut} /></td>
                <td className="px-4 py-3 text-xs">
                  {a.motif
                    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                             style={{ background: "rgba(47,107,255,0.1)", color: "var(--accent)" }}>{a.motif}</span>
                    : <span style={{ color: "var(--muted)" }}>—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {(canEditMotif || canEditStatut) && (
                      <button onClick={() => setEditAbsence(a)} title="Modifier"
                              style={{ color: "var(--accent)" }}>
                        <Pencil className="size-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => onDelete(a.id)} title="Supprimer"
                              style={{ color: "var(--accent4)" }}>
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-1 pt-2">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {totalElements === 0
            ? "Aucun résultat"
            : `Page ${page + 1} sur ${totalPages} — ${totalElements} absence${totalElements !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={isFirst || isFetching}
                  className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text2)" }}>
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter(i => Math.abs(i - page) <= 2)
            .map(i => (
              <button key={i} onClick={() => setPage(i)} disabled={isFetching}
                      className="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium disabled:opacity-40"
                      style={{
                        background: i === page ? "var(--accent)" : "var(--bg)",
                        border: `1px solid ${i === page ? "var(--accent)" : "var(--border)"}`,
                        color: i === page ? "#fff" : "var(--text2)",
                      }}>
                {i + 1}
              </button>
            ))}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={isLast || isFetching}
                  className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text2)" }}>
            <ChevronRight className="size-4" />
            
          </button>
        </div>
      </div>
    </>
  );
}