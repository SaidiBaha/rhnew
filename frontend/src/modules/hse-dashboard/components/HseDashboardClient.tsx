import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import useAuth from "@/hooks/useAuth";
import { useFetchHseKpis } from "@/modules/hse-dashboard/hooks/useFetchHseKpis";
import { useFetchHseByStatus } from "@/modules/hse-dashboard/hooks/useFetchHseByStatus";
import { useFetchHseByLine } from "@/modules/hse-dashboard/hooks/useFetchHseByLine";
import { useFetchHseScores } from "@/modules/hse-dashboard/hooks/useFetchHseScores";
import { useFetchHseTimeline } from "@/modules/hse-dashboard/hooks/useFetchHseTimeline";
import { useFetchHseNokPoints } from "@/modules/hse-dashboard/hooks/useFetchHseNokPoints";
import { useFetchHseNokCategories } from "@/modules/hse-dashboard/hooks/useFetchHseNokCategories";
import { useFetchHseByAuditor } from "@/modules/hse-dashboard/hooks/useFetchHseByAuditor";
import { useFetchHseConformityLevels } from "@/modules/hse-dashboard/hooks/useFetchHseConformityLevels";
import { useFetchHseReportNonConformities } from "@/modules/hse-dashboard/hooks/useFetchHseReportNonConformities";
import { useFetchHseReportByLine } from "@/modules/hse-dashboard/hooks/useFetchHseReportByLine";
import { useFetchHseReportLate } from "@/modules/hse-dashboard/hooks/useFetchHseReportLate";
import type { HseDashboardFilters } from "@/modules/hse-dashboard/types";

/* ─── Color palette ──────────────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  EN_ATTENTE: "#6366f1",
  EN_COURS:   "#f59e0b",
  TERMINE:    "#10b981",
  EN_RETARD:  "#dc5000",
  ANNULE:     "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS:   "En cours",
  TERMINE:    "Terminé",
  EN_RETARD:  "En retard",
  ANNULE:     "Annulé",
};
const ACCENT       = "#2f6bff";
const ACCENT2      = "#00c48c";
const ACCENT3      = "#ff8c00";
const ACCENT4      = "#f03e3e";
const LEVEL_COLORS: Record<string, string> = {
  "Niveau 0 (≥96%)":    ACCENT2,
  "Niveau 1 (60-95%)":  ACCENT3,
  "Niveau 2/3 (<60%)":  ACCENT4,
};

/* ─── Score badge color ──────────────────────────────────────────────────── */
function scoreColor(s: number | null): string {
  if (s == null)  return "#9aa3b8";
  if (s >= 96)    return ACCENT2;
  if (s >= 60)    return ACCENT3;
  return ACCENT4;
}

/* ─── Skeleton loader ────────────────────────────────────────────────────── */
const Skeleton = ({ h = 200 }: { h?: number }) => (
  <div className="animate-pulse rounded-xl bg-[#e4e8f0]" style={{ height: h }} />
);

/* ─── Chart card wrapper ─────────────────────────────────────────────────── */
const ChartCard = ({ title, children, loading, noData }: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  noData?: boolean;
}) => (
  <div
    className="rounded-2xl p-5 flex flex-col gap-3"
    style={{ background: "#fff", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
  >
    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</div>
    {loading ? <Skeleton /> : noData ? (
      <div className="flex items-center justify-center text-sm" style={{ height: 200, color: "var(--muted)" }}>
        Aucune donnée disponible
      </div>
    ) : children}
  </div>
);

/* ─── KPI card ───────────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, color, loading }: {
  label: string; value: string | number; sub?: string;
  color: string; loading?: boolean;
}) => (
  <div
    className="rounded-2xl p-4 flex flex-col gap-1 min-w-0"
    style={{ background: "#fff", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
  >
    <div className="text-xs font-medium truncate" style={{ color: "var(--text2)" }}>{label}</div>
    {loading ? <div className="animate-pulse h-8 bg-[#e4e8f0] rounded mt-1" /> : (
      <div className="text-2xl font-bold truncate" style={{ color }}>{value}</div>
    )}
    {sub && <div className="text-xs" style={{ color: "var(--muted)" }}>{sub}</div>}
  </div>
);

/* ─── Period presets ─────────────────────────────────────────────────────── */
const PERIODS = [
  { label: "Cette semaine", value: "week" },
  { label: "Ce mois",       value: "month" },
  { label: "Ce trimestre",  value: "quarter" },
  { label: "Cette année",   value: "year" },
  { label: "Personnalisé",  value: "custom" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["value"];

function toDates(period: PeriodKey, customFrom?: string, customTo?: string) {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "custom") return { from: customFrom, to: customTo };
  if (period === "week") {
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: fmt(mon), to: fmt(sun) };
  }
  if (period === "month") {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { from: fmt(new Date(now.getFullYear(), q * 3, 1)), to: fmt(now) };
  }
  return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) };
}

/* ══════════════════════════ MAIN COMPONENT ════════════════════════════════ */

export default function HseDashboardClient() {
  const { auth } = useAuth();

  /* ── Filters state ── */
  const [period, setPeriod] = useState<PeriodKey>("year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]   = useState("");
  const [lineZone,  setLineZone]  = useState("");
  const [auditorId, setAuditorId] = useState<number | undefined>();
  const [auditorSearch, setAuditorSearch] = useState("");

  const { from, to } = toDates(period, customFrom, customTo);

  const filters: HseDashboardFilters = useMemo(() => ({
    ...(from     ? { dateFrom: from }    : {}),
    ...(to       ? { dateTo:   to }      : {}),
    ...(lineZone ? { lineZone }          : {}),
    ...(auditorId ? { auditorId }        : {}),
  }), [from, to, lineZone, auditorId]);

  /* ── Data fetching (parallel) ── */
  const { data: kpis,        isLoading: lKpi }  = useFetchHseKpis(filters);
  const { data: byStatus,    isLoading: lStat } = useFetchHseByStatus(filters);
  const { data: byLine,      isLoading: lLine } = useFetchHseByLine(filters);
  const { data: scores,      isLoading: lScr  } = useFetchHseScores(filters);
  const { data: timeline,    isLoading: lTL   } = useFetchHseTimeline(filters);
  const { data: nokPoints,   isLoading: lNokP } = useFetchHseNokPoints(filters);
  const { data: nokCats,     isLoading: lNokC } = useFetchHseNokCategories(filters);
  const { data: byAuditor,   isLoading: lAud  } = useFetchHseByAuditor(filters);
  const { data: confLevels,  isLoading: lConf } = useFetchHseConformityLevels(filters);

  /* ── Report queries (on demand) ── */
  const { data: reportNC,    isLoading: lRNC,  refetch: fetchNC  } = useFetchHseReportNonConformities(filters, false);
  const { data: reportLine,  isLoading: lRLine, refetch: fetchLine } = useFetchHseReportByLine(filters, false);
  const { data: reportLate,  isLoading: lRLate, refetch: fetchLate } = useFetchHseReportLate(filters, false);

  /* ── Auditor options from byAuditor data ── */
  const auditorOptions = useMemo(() => byAuditor ?? [], [byAuditor]);
  const filteredAuditors = useMemo(() =>
    auditorOptions.filter(a =>
      a.fullName.toLowerCase().includes(auditorSearch.toLowerCase()) ||
      a.matricule.toLowerCase().includes(auditorSearch.toLowerCase())
    ), [auditorOptions, auditorSearch]);

  /* ── Export helpers ── */
  async function exportNcExcel() {
    const { data } = await fetchNC();
    const rows = data ?? [];
    if (!rows.length) { toast.error("Aucune donnée à exporter"); return; }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Non-conformités");
    ws.columns = [
      { header: "Date", key: "dateAudit", width: 14 },
      { header: "Ligne", key: "lineZone", width: 20 },
      { header: "Auditeur", key: "auditor", width: 22 },
      { header: "N°", key: "numero", width: 6 },
      { header: "Catégorie", key: "categoryName", width: 22 },
      { header: "Point à vérifier", key: "itemLabel", width: 40 },
      { header: "Description de l'écart", key: "ecartDescription", width: 50 },
      { header: "Photos", key: "hasPhotos", width: 8 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach(r => ws.addRow({ ...r, hasPhotos: r.hasPhotos ? "Oui" : "Non" }));
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Rapport_NonConformites_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Export terminé");
  }

  async function exportLinePdf() {
    const { data } = await fetchLine();
    const rows = data ?? [];
    if (!rows.length) { toast.error("Aucune donnée à exporter"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Rapport de synthèse par ligne de production", 14, 18);
    doc.setFontSize(9);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [["Ligne", "Nb audits", "Score moyen (%)", "Nb N'OK", "Niveau"]],
      body: rows.map(r => [r.lineZone, r.nbAudits, r.scoreMoyen != null ? r.scoreMoyen.toFixed(1) : "N/A", r.nbNok, r.niveauDominant]),
    });
    doc.save(`Synthese_Lignes_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success("Export terminé");
  }

  async function exportLineExcel() {
    const { data } = await fetchLine();
    const rows = data ?? [];
    if (!rows.length) { toast.error("Aucune donnée à exporter"); return; }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Synthèse lignes");
    ws.columns = [
      { header: "Ligne", key: "lineZone", width: 24 },
      { header: "Nb audits", key: "nbAudits", width: 12 },
      { header: "Score moyen (%)", key: "scoreMoyen", width: 18 },
      { header: "Nb N'OK", key: "nbNok", width: 10 },
      { header: "Niveau dominant", key: "niveauDominant", width: 18 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach(r => ws.addRow({ ...r, scoreMoyen: r.scoreMoyen != null ? r.scoreMoyen.toFixed(1) : "N/A" }));
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Synthese_Lignes_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Export terminé");
  }

  async function exportLateExcel() {
    const { data } = await fetchLate();
    const rows = data ?? [];
    if (!rows.length) { toast.error("Aucune donnée à exporter"); return; }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Retards");
    ws.columns = [
      { header: "ID", key: "auditId", width: 8 },
      { header: "Date prévue", key: "datePrevue", width: 14 },
      { header: "Ligne", key: "lineZone", width: 22 },
      { header: "Auditeur", key: "auditorName", width: 24 },
      { header: "Nb jours retard", key: "nbJoursRetard", width: 16 },
      { header: "Complété en retard", key: "completedLate", width: 18 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach(r => ws.addRow({ ...r, completedLate: r.completedLate ? "Oui" : "Non" }));
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Rapport_Retards_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Export terminé");
  }

  /* ── Sorting state for auditor table ── */
  const [sortKey, setSortKey] = useState<keyof (typeof byAuditor extends (infer T)[] | undefined ? T : never) | "">("");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const sortedAuditors = useMemo(() => {
    if (!byAuditor || !sortKey) return byAuditor ?? [];
    return [...byAuditor].sort((a, b) => {
      const va = (a as any)[sortKey] ?? 0;
      const vb = (b as any)[sortKey] ?? 0;
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [byAuditor, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key as any); setSortDir("desc"); }
  };

  const sortIcon = (key: string) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  /* ── Pie chart data ── */
  const pieData = useMemo(() =>
    (byStatus ?? []).map(s => ({
      name: STATUS_LABELS[s.status] ?? s.status,
      value: s.count,
      pct: s.percentage,
      fill: STATUS_COLORS[s.status] ?? "#9aa3b8",
    })), [byStatus]);

  const conformityData = useMemo(() =>
    Object.entries(confLevels ?? {}).map(([name, value]) => ({
      name, value, fill: LEVEL_COLORS[name] ?? "#9aa3b8",
    })), [confLevels]);

  /* ── Score bar chart: add color per bar ── */
  const scoreData = useMemo(() =>
    (scores ?? []).map(s => ({
      ...s,
      fill: scoreColor(s.scoreMoyen),
    })), [scores]);

  return (
    <div className="flex flex-col gap-6 px-6 pb-10" style={{ maxWidth: 1400 }}>

      {/* ══ Header + Filters ══ */}
      <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Dashboard HSE</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>
            Analyse des audits, checklists et conformité
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: period === p.value ? "var(--accent)" : "#fff",
                  color: period === p.value ? "#fff" : "var(--text2)",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom dates */}
          {period === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text)" }} />
              <span className="text-xs" style={{ color: "var(--muted)" }}>→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text)" }} />
            </>
          )}

          {/* Line zone filter */}
          <input
            placeholder="Ligne de production…"
            value={lineZone}
            onChange={e => setLineZone(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-xs outline-none w-44"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />

          {/* Auditor filter */}
          <select
            value={auditorId ?? ""}
            onChange={e => setAuditorId(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-lg border px-3 py-1.5 text-xs outline-none w-44"
            style={{ borderColor: "var(--border)", color: "var(--text)", background: "#fff" }}
          >
            <option value="">Tous les auditeurs</option>
            {(byAuditor ?? []).map(a => (
              <option key={a.employeeId} value={a.employeeId}>{a.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ══ KPI Cards ══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard label="Total audits"      value={kpis?.totalAudits ?? 0}  color={ACCENT}        loading={lKpi} />
        <KpiCard label="Terminés"          value={kpis?.termine ?? 0}      color={ACCENT2}       loading={lKpi} />
        <KpiCard label="En cours"          value={kpis?.enCours ?? 0}      color="#f59e0b"       loading={lKpi} />
        <KpiCard label="En retard"         value={kpis?.enRetard ?? 0}     color={ACCENT3}       loading={lKpi} />
        <KpiCard label="Annulés"           value={kpis?.annule ?? 0}       color={ACCENT4}       loading={lKpi} />
        <KpiCard label="Taux complétion"   value={`${kpis?.tauxCompletion ?? 0}%`}
          color={scoreColor(kpis?.tauxCompletion ?? null)} loading={lKpi} />
        <KpiCard label="Score moyen"
          value={kpis?.scoreMoyenGlobal != null ? `${kpis.scoreMoyenGlobal}%` : "—"}
          color={scoreColor(kpis?.scoreMoyenGlobal ?? null)} loading={lKpi} />
        <KpiCard label="Complétés en retard" value={kpis?.completedLate ?? 0} color={ACCENT3} loading={lKpi} />
      </div>

      {/* ══ Row 1 : Donut statuts + Évolution mensuelle ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Répartition des statuts" loading={lStat} noData={!pieData.length}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} innerRadius={45} paddingAngle={3}>
                {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v: any, n: any, p: any) => [`${v} (${p.payload.pct}%)`, n]} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Évolution mensuelle" loading={lTL} noData={!timeline?.length}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline ?? []} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconSize={10} />
              <Line type="monotone" dataKey="planifies" name="Planifiés"  stroke={ACCENT}  strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="termines"  name="Terminés"   stroke={ACCENT2} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ══ Row 2 : Audits par ligne + Scores par ligne ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Audits par ligne de production" loading={lLine} noData={!byLine?.length}>
          <ResponsiveContainer width="100%" height={Math.max(220, (byLine?.length ?? 0) * 36)}>
            <BarChart data={byLine ?? []} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="lineZone" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Legend iconSize={10} />
              <Bar dataKey="termine"   name="Terminé"    stackId="a" fill={ACCENT2}  />
              <Bar dataKey="enCours"   name="En cours"   stackId="a" fill="#f59e0b"  />
              <Bar dataKey="enRetard"  name="En retard"  stackId="a" fill={ACCENT3}  />
              <Bar dataKey="enAttente" name="En attente" stackId="a" fill="#6366f1"  />
              <Bar dataKey="annule"    name="Annulé"     stackId="a" fill={ACCENT4}  />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Score moyen par ligne (%)" loading={lScr} noData={!scores?.length}>
          <ResponsiveContainer width="100%" height={Math.max(220, (scores?.length ?? 0) * 36)}>
            <BarChart data={scoreData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="lineZone" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v: any) => [`${v}%`, "Score moyen"]} />
              <ReferenceLine x={60} stroke={ACCENT3} strokeDasharray="4 2" label={{ value: "60%", position: "top", fontSize: 10 }} />
              <ReferenceLine x={96} stroke={ACCENT2} strokeDasharray="4 2" label={{ value: "96%", position: "top", fontSize: 10 }} />
              <Bar dataKey="scoreMoyen" name="Score moyen">
                {scoreData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ══ Row 3 : Niveaux de conformité + Top 5 N'OK points ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Distribution des niveaux de conformité" loading={lConf} noData={!conformityData.length}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={conformityData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} innerRadius={45} paddingAngle={3}>
                {conformityData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [`${v} checklist(s)`, n]} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 5 — Points N'OK les plus fréquents" loading={lNokP} noData={!nokPoints?.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={nokPoints ?? []} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="itemLabel" type="category" tick={{ fontSize: 10 }} width={130}
                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
              <Tooltip formatter={(v: any) => [v, "N'OK"]}
                labelFormatter={(l: string) => l.length > 40 ? l.slice(0, 40) + "…" : l} />
              <Bar dataKey="nokCount" name="N'OK" fill={ACCENT4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ══ Row 4 : Top 5 catégories N'OK ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 5 — Catégories les plus non-conformes" loading={lNokC} noData={!nokCats?.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={nokCats ?? []} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="categoryName" type="category" tick={{ fontSize: 10 }} width={130}
                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
              <Tooltip formatter={(v: any) => [v, "N'OK cumulés"]} />
              <Bar dataKey="nokCount" name="N'OK" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* placeholder for calendar heatmap (future) */}
        <ChartCard title="Activité des 12 derniers mois" loading={lTL} noData={!timeline?.length}>
          <div className="flex flex-wrap gap-1 py-2">
            {(timeline ?? []).map((t, i) => {
              const max = Math.max(...(timeline ?? []).map(x => x.termines), 1);
              const ratio = t.termines / max;
              const bg = ratio === 0 ? "#f1f5f9"
                : ratio < 0.33 ? "#bfdbfe"
                : ratio < 0.66 ? "#60a5fa"
                : "#2563eb";
              return (
                <div key={i} title={`${t.month}: ${t.termines} terminé(s)`}
                  className="rounded flex items-center justify-center text-[9px] font-medium"
                  style={{ width: 42, height: 42, background: bg, color: ratio > 0.5 ? "#fff" : "#374151" }}>
                  {t.month.slice(5)}
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* ══ Performance par auditeur ══ */}
      <ChartCard title="Performance par auditeur" loading={lAud} noData={!byAuditor?.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "2px solid var(--border)" }}>
                {[
                  { key: "fullName",       label: "Auditeur" },
                  { key: "nbAssigned",     label: "Assignés" },
                  { key: "nbTermine",      label: "Terminés" },
                  { key: "nbEnRetard",     label: "En retard" },
                  { key: "scoreMoyen",     label: "Score moyen" },
                  { key: "tauxCompletion", label: "Taux complétion" },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-3 py-2 text-left text-xs font-semibold cursor-pointer select-none"
                    style={{ color: "var(--text2)" }}>
                    {col.label}{sortIcon(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAuditors.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}
                  className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-3 py-2 font-medium" style={{ color: "var(--text)" }}>
                    {a.fullName}
                    <span className="ml-1 text-xs font-mono" style={{ color: "var(--muted)" }}>#{a.matricule}</span>
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: "var(--text2)" }}>{a.nbAssigned}</td>
                  <td className="px-3 py-2 text-center font-medium" style={{ color: ACCENT2 }}>{a.nbTermine}</td>
                  <td className="px-3 py-2 text-center font-medium" style={{ color: a.nbEnRetard > 0 ? ACCENT4 : "var(--text2)" }}>{a.nbEnRetard}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: scoreColor(a.scoreMoyen) + "22", color: scoreColor(a.scoreMoyen) }}>
                      {a.scoreMoyen != null ? `${a.scoreMoyen}%` : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full h-1.5 bg-[#e4e8f0] overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${a.tauxCompletion}%`,
                          background: scoreColor(a.tauxCompletion),
                        }} />
                      </div>
                      <span className="text-xs font-semibold w-10 text-right" style={{ color: "var(--text2)" }}>
                        {a.tauxCompletion}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ══ Rapports exportables ══ */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <div className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
          Rapports exportables
        </div>
        <div className="flex flex-wrap gap-3">

          {/* Rapport non-conformités */}
          <button
            onClick={exportNcExcel}
            disabled={lRNC}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent)" }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            {lRNC ? "Chargement…" : "Non-conformités (Excel)"}
          </button>

          {/* Rapport synthèse lignes PDF */}
          <button
            onClick={exportLinePdf}
            disabled={lRLine}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "#fef2f2", color: ACCENT4, border: `1px solid ${ACCENT4}` }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            {lRLine ? "Chargement…" : "Synthèse lignes (PDF)"}
          </button>

          {/* Rapport synthèse lignes Excel */}
          <button
            onClick={exportLineExcel}
            disabled={lRLine}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "#f0fdf4", color: ACCENT2, border: `1px solid ${ACCENT2}` }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            {lRLine ? "Chargement…" : "Synthèse lignes (Excel)"}
          </button>

          {/* Rapport retards */}
          <button
            onClick={exportLateExcel}
            disabled={lRLate}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "#fff7ed", color: ACCENT3, border: `1px solid ${ACCENT3}` }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {lRLate ? "Chargement…" : "Audits en retard (Excel)"}
          </button>
        </div>
      </div>

    </div>
  );
}
