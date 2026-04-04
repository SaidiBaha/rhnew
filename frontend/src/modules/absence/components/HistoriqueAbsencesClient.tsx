import { useState, useRef, useEffect } from "react";
import {
  Search, X, ChevronLeft, ChevronRight, Eye,
  CheckCircle, XCircle, Clock, Pencil,
} from "lucide-react";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { Loader } from "@/components/Loader";
import useAuth from "@/hooks/useAuth";

import { useFetchHistoriqueSummary } from "@/modules/absence/hooks/useFetchHistoriqueSummary";
import { useFetchEmployeeAbsences } from "@/modules/absence/hooks/useFetchEmployeeAbsences";
import { useUpdateAbsence } from "@/modules/absence/hooks/useUpdateAbsence";

import type { Absence, AbsenceStatut, EmployeeAbsenceSummary, UpdateAbsenceInput } from "@/modules/absence/types";
import type { UserRole } from "@/modules/auth/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type BackendErrorDto = { code?: string | number; message?: string; errors?: string[] };
function extractAxiosError(err: unknown) {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<BackendErrorDto>;
    const d = e.response?.data;
    return { message: d?.message ?? e.message ?? "Erreur API" };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: "Erreur inattendue" };
}

/** Returns first/last day of a given YYYY-MM month string. */
function monthToRange(month: string): { dateFrom: string; dateTo: string } {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last  = new Date(y, m, 0);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { dateFrom: fmt(first), dateTo: fmt(last) };
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function StatutBadge({ statut }: { statut: AbsenceStatut }) {
  if (statut === "PENDING")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(47,107,255,0.1)", color: "var(--accent)" }}>
        <Clock className="size-3" /> Shift pas encore commencé
      </span>
    );
  if (statut === "ABSENT")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(240,62,62,0.1)", color: "var(--accent4)" }}>
        <XCircle className="size-3" /> Absent
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: "rgba(0,196,140,0.1)", color: "var(--accent2)" }}>
      <CheckCircle className="size-3" /> Présent
    </span>
  );
}

// ─── Edit modal (for detail view) ────────────────────────────────────────────

interface EditModalProps {
  absence: Absence;
  canEditMotif: boolean;
  canEditStatut: boolean;
  canEditHeureDebut: boolean;
  onClose: () => void;
  onSubmit: (dto: UpdateAbsenceInput) => void;
  isLoading: boolean;
}
function EditAbsenceModal({ absence, canEditMotif, canEditStatut, canEditHeureDebut, onClose, onSubmit, isLoading }: EditModalProps) {
  const [motif,      setMotif]      = useState(absence.motif ?? "");
  const [statut,     setStatut]     = useState<AbsenceStatut>(absence.statut ?? "ABSENT");
  const [heureDebut, setHeureDebut] = useState(absence.heureDebut?.slice(0, 5) ?? "06:00");
  const [heureEntree,setHeureEntree]= useState(absence.heureEntree?.slice(0, 5) ?? "");
  const [heureSortie,setHeureSortie]= useState(absence.heureSortie?.slice(0, 5) ?? "");
  const [confirm,    setConfirm]    = useState(false);

  function handleSubmit() {
    if (!confirm) { setConfirm(true); return; }
    onSubmit({
      motif:       canEditMotif      ? (motif || undefined)      : undefined,
      statut:      canEditStatut     ? statut                    : undefined,
      heureDebut:  canEditHeureDebut ? (heureDebut || undefined) : undefined,
      heureEntree: heureEntree || undefined,
      heureSortie: heureSortie || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
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
          {canEditHeureDebut && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>Heure début</label>
              <input type="text" value={heureDebut} onChange={e => setHeureDebut(e.target.value)}
                     placeholder="06:00" maxLength={5}
                     className="h-9 rounded-lg border px-3 text-sm outline-none text-center font-mono"
                     style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>Heure entrée</label>
            <input type="text" value={heureEntree} onChange={e => setHeureEntree(e.target.value)}
                   placeholder="06:00" maxLength={5}
                   className="h-9 rounded-lg border px-3 text-sm outline-none text-center font-mono"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>Heure sortie</label>
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
              <option value="PENDING">🔵 Shift pas encore commencé</option>
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
                  style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>Annuler</button>
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

// ─── Employee detail modal ────────────────────────────────────────────────────

interface DetailModalProps {
  employee: EmployeeAbsenceSummary;
  canEdit: boolean;
  canEditMotif: boolean;
  canEditStatut: boolean;
  canEditHeureDebut: boolean;
  onClose: () => void;
}
function EmployeeDetailModal({ employee, canEdit, canEditMotif, canEditStatut, canEditHeureDebut, onClose }: DetailModalProps) {
  const [detailMonth,    setDetailMonth]    = useState(currentMonth());
  const [detailDateFrom, setDetailDateFrom] = useState(monthToRange(currentMonth()).dateFrom);
  const [detailDateTo,   setDetailDateTo]   = useState(monthToRange(currentMonth()).dateTo);
  const [detailStatut,   setDetailStatut]   = useState<AbsenceStatut | "">("");
  const [detailPage,     setDetailPage]     = useState(0);
  const [editAbsence,    setEditAbsence]    = useState<Absence | null>(null);

  const updateAbsence = useUpdateAbsence();

  // Sync month picker → date range
  function onMonthChange(m: string) {
    setDetailMonth(m);
    const { dateFrom, dateTo } = monthToRange(m);
    setDetailDateFrom(dateFrom);
    setDetailDateTo(dateTo);
    setDetailPage(0);
  }

  const { data: pageData, isLoading, isFetching } = useFetchEmployeeAbsences(
    employee.matricule,
    detailPage, 50,
    {
      dateFrom: detailDateFrom || undefined,
      dateTo:   detailDateTo   || undefined,
      statut:   detailStatut   || undefined,
    }
  );

  const records     = pageData?.content ?? [];
  const totalEl     = pageData?.totalElements ?? 0;
  const totalPgs    = pageData?.totalPages ?? 1;
  const isFirst     = pageData?.first ?? true;
  const isLast      = pageData?.last ?? true;

  const joursPresent = records.filter(r => r.statut === "PRESENT").length;
  const joursAbsent  = records.filter(r => r.statut === "ABSENT").length;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {editAbsence && (
        <EditAbsenceModal
          absence={editAbsence}
          canEditMotif={canEditMotif}
          canEditStatut={canEditStatut}
          canEditHeureDebut={canEditHeureDebut}
          onClose={() => setEditAbsence(null)}
          onSubmit={onEditSubmit}
          isLoading={updateAbsence.isPending} />
      )}
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl"
           style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
             style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {employee.fullName}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {employee.matricule}{employee.departement ? ` — ${employee.departement}` : ""}
            </p>
          </div>
          <button onClick={onClose}><X className="size-5" style={{ color: "var(--muted)" }} /></button>
        </div>

        {/* Summary strip */}
        <div className="flex items-center gap-6 px-6 py-3"
             style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4" style={{ color: "var(--accent2)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {joursPresent} jour{joursPresent !== 1 ? "s" : ""} présent{joursPresent !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="size-4" style={{ color: "var(--accent4)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {joursAbsent} jour{joursAbsent !== 1 ? "s" : ""} absent{joursAbsent !== 1 ? "s" : ""}
            </span>
          </div>
          {isFetching && <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>Chargement…</span>}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 px-6 py-3"
             style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Mois</label>
            <input type="month" value={detailMonth} onChange={e => onMonthChange(e.target.value)}
                   className="h-9 rounded-lg border px-2 text-sm outline-none"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 150 }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Du</label>
            <input type="date" value={detailDateFrom} onChange={e => { setDetailDateFrom(e.target.value); setDetailPage(0); }}
                   className="h-9 rounded-lg border px-2 text-sm outline-none"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 140 }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Au</label>
            <input type="date" value={detailDateTo} onChange={e => { setDetailDateTo(e.target.value); setDetailPage(0); }}
                   className="h-9 rounded-lg border px-2 text-sm outline-none"
                   style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 140 }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Statut</label>
            <select value={detailStatut} onChange={e => { setDetailStatut(e.target.value as AbsenceStatut | ""); setDetailPage(0); }}
                    className="h-9 rounded-lg border px-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 140 }}>
              <option value="">Tous</option>
              <option value="PRESENT">Présent</option>
              <option value="ABSENT">Absent</option>
              <option value="PENDING">Shift pas encore commencé</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-sm" style={{ color: "var(--muted)" }}>Chargement…</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ position: "sticky", top: 0, background: "var(--bg)", zIndex: 1 }}>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Date","Horaire","Début","Fin","Entrée","Sortie","Statut","Motif",
                    ...(canEdit ? ["Actions"] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text2)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={canEdit ? 9 : 8} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                    Aucun enregistrement trouvé
                  </td></tr>
                ) : records.map(r => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-4 py-3" style={{ color: "var(--text2)" }}>
                      {new Date(r.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text2)" }}>{r.horaire ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>{r.heureDebut ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>{r.heureFin ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: r.heureEntree ? "var(--text)" : "var(--muted)" }}>
                      {r.heureEntree ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>{r.heureSortie ?? "—"}</td>
                    <td className="px-4 py-3"><StatutBadge statut={r.statut} /></td>
                    <td className="px-4 py-3 text-xs">
                      {r.motif
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                 style={{ background: "rgba(47,107,255,0.1)", color: "var(--accent)" }}>{r.motif}</span>
                        : <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <button onClick={() => setEditAbsence(r)} title="Modifier"
                                style={{ color: "var(--accent)" }}>
                          <Pencil className="size-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3"
             style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {totalEl === 0 ? "Aucun résultat" : `${totalEl} enregistrement${totalEl !== 1 ? "s" : ""} — Page ${detailPage + 1}/${totalPgs}`}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setDetailPage(p => Math.max(0, p - 1))} disabled={isFirst || isFetching}
                    className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => setDetailPage(p => Math.min(totalPgs - 1, p + 1))} disabled={isLast || isFetching}
                    className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HistoriqueAbsencesClient() {
  const { auth } = useAuth();
  const role = auth.user?.role as UserRole | undefined;

  const isAdmin      = role === "ADMIN";
  const isSupervisor = role === "SUPERVISOR";
  const isInfirmiere = (role as string) === "INFIRMIERE";

  const canEdit         = isAdmin || isSupervisor || isInfirmiere;
  const canEditMotif    = isAdmin || isInfirmiere;
  const canEditStatut   = isAdmin || isSupervisor || isInfirmiere;
  const canEditHeureDebut = isAdmin || isSupervisor;

  // ── Filter state ──────────────────────────────────────────────────────────
  const [month,        setMonth]        = useState(currentMonth());
  const [dateFrom,     setDateFrom]     = useState(monthToRange(currentMonth()).dateFrom);
  const [dateTo,       setDateTo]       = useState(monthToRange(currentMonth()).dateTo);
  const [departement,  setDepartement]  = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [detailEmployee, setDetailEmployee] = useState<EmployeeAbsenceSummary | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  function onMonthChange(m: string) {
    setMonth(m);
    const { dateFrom: df, dateTo: dt } = monthToRange(m);
    setDateFrom(df);
    setDateTo(dt);
  }

  const { data: summaryData, isLoading, isFetching } = useFetchHistoriqueSummary({
    dateFrom:    dateFrom    || undefined,
    dateTo:      dateTo      || undefined,
    departement: departement || undefined,
  });

  // Client-side search filter on returned data
  const employees = (summaryData ?? []).filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.matricule.toLowerCase().includes(q)
    );
  });

  const totalPresent = employees.reduce((s, e) => s + e.joursPresent, 0);
  const totalAbsent  = employees.reduce((s, e) => s + e.joursAbsent, 0);

  if (isLoading) return <Loader />;

  return (
    <>
      {detailEmployee && (
        <EmployeeDetailModal
          employee={detailEmployee}
          canEdit={canEdit}
          canEditMotif={canEditMotif}
          canEditStatut={canEditStatut}
          canEditHeureDebut={canEditHeureDebut}
          onClose={() => setDetailEmployee(null)} />
      )}

      <div className="flex items-center justify-between">
        <Heading
          title="Historique des absences"
          description="Récapitulatif par employé — présences et absences." />
      </div>

      <Separator />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Mois</label>
          <input type="month" value={month} onChange={e => onMonthChange(e.target.value)}
                 className="h-9 rounded-lg border px-2 text-sm outline-none"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 150 }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Du</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                 className="h-9 rounded-lg border px-2 text-sm outline-none"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 140 }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Au</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                 className="h-9 rounded-lg border px-2 text-sm outline-none"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 140 }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Département</label>
          <input type="text" placeholder="Filtrer…" value={departement}
                 onChange={e => setDepartement(e.target.value)}
                 className="h-9 rounded-lg border px-2 text-sm outline-none"
                 style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 160 }} />
        </div>
        <div className="relative" style={{ minWidth: 200 }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>Recherche</label>
            <div className="relative">
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
          </div>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs self-end pb-2" style={{ color: "var(--muted)" }}>Chargement…</span>
        )}
      </div>

      {/* ── Summary totals ── */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg"
             style={{ background: "rgba(0,196,140,0.08)", border: "1px solid rgba(0,196,140,0.2)" }}>
          <CheckCircle className="size-4" style={{ color: "var(--accent2)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {totalPresent} jour-présence{totalPresent !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg"
             style={{ background: "rgba(240,62,62,0.08)", border: "1px solid rgba(240,62,62,0.2)" }}>
          <XCircle className="size-4" style={{ color: "var(--accent4)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {totalAbsent} jour-absence{totalAbsent !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {employees.length} employé{employees.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Main table ── */}
      <div className="overflow-x-auto rounded-xl border" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Matricule","Prénom","Département","Jours Présent","Jours Absent","Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text2)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
                Aucun employé trouvé pour cette période
              </td></tr>
            ) : employees.map(e => (
              <tr key={e.matricule} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text2)" }}>{e.matricule}</td>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{e.fullName}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>{e.departement ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "rgba(0,196,140,0.1)", color: "var(--accent2)" }}>
                    <CheckCircle className="size-3" /> {e.joursPresent}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "rgba(240,62,62,0.1)", color: "var(--accent4)" }}>
                    <XCircle className="size-3" /> {e.joursAbsent}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setDetailEmployee(e)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors"
                          style={{ border: "1px solid var(--border)", color: "var(--accent)", background: "var(--accent-light)" }}>
                    <Eye className="size-3.5" /> Détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
