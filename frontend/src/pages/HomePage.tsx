// src/pages/HomePage.tsx
import { useMemo, useState } from "react";
import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useFetchProjectHours } from "@/modules/dashboard/hooks/useFetchProjectHours";
import useAuth from "@/hooks/useAuth";

import { exportProjectHoursToExcel } from "@/modules/dashboard/utils/exportProjectHoursExcel";
import { exportProjectHoursToPdf } from "@/modules/dashboard/utils/exportProjectHoursPdf";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Brush,
} from "recharts";

function hasRole(auth: any, role: string) {
  const r =
    auth?.user?.role ||
    auth?.role ||
    auth?.user?.authorities?.[0] ||
    auth?.authorities?.[0] ||
    null;
  if (!r) return false;
  const raw = typeof r === "string" ? r : r?.authority;
  if (!raw) return false;
  return String(raw).replace("ROLE_", "") === role;
}

type RowApi = {
  idProjet: number;
  nomProjet: string;
  idSuperviseur: number | null;
  nomSuperviseur: string;
  matriculeSuperviseur?: string | null;
  heuresAjoutees: number;
  heuresTransferees: number;
};

type RowProjet = {
  idProjet: number;
  nomProjet: string;
  idSuperviseur: number | null;
  nomSuperviseur: string;
  matriculeSuperviseur: string | null;
  heuresAjoutees: number;
  heuresTransferees: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatH(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(2)} h`;
}

function truncate(s: string, max = 18) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Shared aggregation logic — 1 row per project */
function aggregateRows(rows: RowApi[]): RowProjet[] {
  type SupAgg = { id: number | null; nom: string; matricule: string | null; score: number };
  type Agg = {
    idProjet: number;
    nomProjet: string;
    heuresAjoutees: number;
    heuresTransferees: number;
    bySup: Map<string, SupAgg>;
  };

  const map = new Map<number, Agg>();

  for (const r of rows) {
    const idProjet = Number(r.idProjet);
    if (!Number.isFinite(idProjet)) continue;

    const nomProjet =
      (r.nomProjet ?? `Projet #${idProjet}`).toString().trim() || `Projet #${idProjet}`;
    const supId =
      r.idSuperviseur === undefined || r.idSuperviseur === null
        ? null
        : Number(r.idSuperviseur);
    const supNom = (r.nomSuperviseur ?? "").toString().trim() || (supId ? `#${supId}` : "");
    const supMat =
      r.matriculeSuperviseur === undefined || r.matriculeSuperviseur === null
        ? null
        : String(r.matriculeSuperviseur);

    const added = Number.isFinite(Number(r.heuresAjoutees)) ? Number(r.heuresAjoutees) : 0;
    const transferred = Number.isFinite(Number(r.heuresTransferees))
      ? Number(r.heuresTransferees)
      : 0;
    const score = added + transferred;
    const supKey = `${supId ?? "null"}|${supNom}|${supMat ?? ""}`;

    let agg = map.get(idProjet);
    if (!agg) {
      agg = { idProjet, nomProjet, heuresAjoutees: 0, heuresTransferees: 0, bySup: new Map() };
      map.set(idProjet, agg);
    }
    agg.heuresAjoutees += added;
    agg.heuresTransferees += transferred;
    if (!agg.nomProjet || agg.nomProjet.startsWith("Projet #")) agg.nomProjet = nomProjet;

    const ex = agg.bySup.get(supKey);
    if (!ex) agg.bySup.set(supKey, { id: supId, nom: supNom, matricule: supMat, score });
    else ex.score += score;
  }

  const out: RowProjet[] = [];
  for (const a of map.values()) {
    let best: SupAgg | null = null;
    for (const s of a.bySup.values()) {
      if (!best) best = s;
      else if ((s.score ?? 0) > (best.score ?? 0)) best = s;
    }
    out.push({
      idProjet: a.idProjet,
      nomProjet: a.nomProjet,
      idSuperviseur: best?.id ?? null,
      nomSuperviseur: best?.nom ?? "",
      matriculeSuperviseur: best?.matricule ?? null,
      heuresAjoutees: round2(a.heuresAjoutees),
      heuresTransferees: round2(a.heuresTransferees),
    });
  }

  out.sort((a, b) => a.nomProjet.localeCompare(b.nomProjet, undefined, { sensitivity: "base" }));
  return out;
}

// ─── UI Sub-components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: "blue" | "amber" | "emerald" | "violet";
  icon: React.ReactNode;
}) {
  const palette = {
    blue:    { bg: "bg-blue-50 border-blue-100",    icon: "bg-blue-100 text-blue-600",    val: "text-blue-700" },
    amber:   { bg: "bg-amber-50 border-amber-100",  icon: "bg-amber-100 text-amber-600",  val: "text-amber-700" },
    emerald: { bg: "bg-emerald-50 border-emerald-100", icon: "bg-emerald-100 text-emerald-600", val: "text-emerald-700" },
    violet:  { bg: "bg-violet-50 border-violet-100", icon: "bg-violet-100 text-violet-600", val: "text-violet-700" },
  }[color];

  return (
    <div className={`rounded-2xl border ${palette.bg} p-5 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${palette.icon}`}>
          {icon}
        </span>
      </div>
      <div className={`mt-3 text-2xl font-bold ${palette.val}`}>{value}</div>
    </div>
  );
}

/** Semi-circle gauge */
function GaugeCard({
  title,
  subtitle,
  percent,
  legendLeft,
  legendRight,
}: {
  title: string;
  subtitle?: string;
  percent: number;
  legendLeft: string;
  legendRight: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const data = [
    { name: "left",  value: p },
    { name: "right", value: 100 - p },
    { name: "rest",  value: 0 },
  ];
  const COLORS = ["#3b82f6", "#f59e0b", "#e5e7eb"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
          {p.toFixed(1)}%
        </div>
      </div>

      <div className="mt-3 h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%" cy="100%"
              startAngle={180} endAngle={0}
              innerRadius={60} outerRadius={82}
              paddingAngle={2}
              stroke="transparent"
              isAnimationActive={false}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx] ?? "#e5e7eb"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "rest" || Number(value) === 0) return null;
                const label = name === "left" ? legendLeft : legendRight;
                return [`${Number(value).toFixed(1)}%`, label];
              }}
              contentStyle={{
                borderRadius: "0.5rem",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                padding: "6px 10px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-slate-700">{legendLeft}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-slate-700">{legendRight}</span>
        </div>
      </div>
    </div>
  );
}

/** Grouped bar chart — ajoutées vs transférées per project */
function ProjectsAddedTransferredCard({
  title,
  subtitle,
  data,
  activeProjectId,
  onToggleProject,
  chartDate,
  onChartDateChange,
  loading,
  onReset,
}: {
  title: string;
  subtitle?: string;
  data: { id: number; name: string; ajoutees: number; transferees: number }[];
  activeProjectId: number | null;
  onToggleProject: (id: number) => void;
  chartDate: string | "";
  onChartDateChange: (v: string) => void;
  loading?: boolean;
  onReset?: () => void;
}) {
  const ADDED_COLOR = "#3b82f6";
  const TRANSFERRED_COLOR = "#f59e0b";
  const fadedOpacity = 0.3;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={chartDate}
            onChange={(e) => onChartDateChange(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-[#6b7a12]"
          />
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {activeProjectId !== null && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs text-blue-700">
            Filtre actif : <strong>#{activeProjectId}</strong>
            <button onClick={() => onToggleProject(activeProjectId)} className="hover:text-blue-900">✕</button>
          </span>
        </div>
      )}

      <div className="relative mt-3 h-[290px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-slate-500 text-sm backdrop-blur-[1px]">
            Chargement…
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={48} tickMargin={8} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: any, _name: any, props: any) => {
                const label = props?.dataKey === "ajoutees" ? "Ajoutées" : "Transférées";
                return [`${Number(v).toFixed(2)} h`, label];
              }}
              labelFormatter={(l: any) => String(l)}
              contentStyle={{ borderRadius: "0.5rem", fontSize: "12px" }}
            />
            <Legend verticalAlign="top" height={20} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="ajoutees" name="Ajoutées" fill={ADDED_COLOR} radius={[5, 5, 0, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={`aj-${d.id}-${i}`}
                  cursor="pointer"
                  fill={ADDED_COLOR}
                  fillOpacity={activeProjectId === null || activeProjectId === d.id ? 1 : fadedOpacity}
                  onClick={() => onToggleProject(d.id)}
                />
              ))}
            </Bar>
            <Bar dataKey="transferees" name="Transférées" fill={TRANSFERRED_COLOR} radius={[5, 5, 0, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={`tr-${d.id}-${i}`}
                  cursor="pointer"
                  fill={TRANSFERRED_COLOR}
                  fillOpacity={activeProjectId === null || activeProjectId === d.id ? 1 : fadedOpacity}
                  onClick={() => onToggleProject(d.id)}
                />
              ))}
            </Bar>
            <Brush dataKey="name" height={16} stroke="#cbd5e1" travellerWidth={8} />
          </BarChart>
        </ResponsiveContainer>
        {data.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Aucun résultat pour ces filtres.
          </div>
        )}
      </div>
      <p className="mt-1 text-[10px] text-slate-400">
        Cliquez une barre pour isoler un projet — cliquez à nouveau pour enlever le filtre.
      </p>
    </div>
  );
}

/** Top projets — stacked horizontal bar chart */
function TopProjectsCard({
  data,
  loading,
}: {
  data: { name: string; ajoutees: number; transferees: number; total: number }[];
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 text-sm font-semibold text-slate-900">Top projets — heures totales</div>
      <div className="mb-3 text-xs text-slate-500">
        Classement par volume d'heures cumulées (ajoutées + transférées)
      </div>

      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-slate-400 text-sm">
          {loading ? "Chargement…" : "Aucune donnée disponible."}
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: any, _name: any, props: any) => {
                  const label = props?.dataKey === "ajoutees" ? "Ajoutées" : "Transférées";
                  return [`${Number(v).toFixed(2)} h`, label];
                }}
                contentStyle={{ borderRadius: "0.5rem", fontSize: "12px" }}
              />
              <Legend verticalAlign="top" height={22} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ajoutees" name="Ajoutées" fill="#3b82f6" radius={[0, 0, 0, 0]} stackId="s" />
              <Bar dataKey="transferees" name="Transférées" fill="#f59e0b" radius={[0, 4, 4, 0]} stackId="s" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Analyse par superviseur */
function SupervisorAnalysisCard({
  data,
  loading,
}: {
  data: { name: string; ajoutees: number; transferees: number }[];
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 text-sm font-semibold text-slate-900">Analyse par superviseur</div>
      <div className="mb-3 text-xs text-slate-500">
        Heures ajoutées et transférées par superviseur (top 8)
      </div>

      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-slate-400 text-sm">
          {loading ? "Chargement…" : "Aucune donnée disponible."}
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: any, _name: any, props: any) => {
                  const label = props?.dataKey === "ajoutees" ? "Ajoutées" : "Transférées";
                  return [`${Number(v).toFixed(2)} h`, label];
                }}
                contentStyle={{ borderRadius: "0.5rem", fontSize: "12px" }}
              />
              <Legend verticalAlign="top" height={22} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ajoutees" name="Ajoutées" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="transferees" name="Transférées" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className="ml-1 inline-block text-[10px] opacity-60">
      {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { auth } = useAuth();
  const isOpManager = hasRole(auth, "OPERATIONAL_MANAGER");

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = useMemo(() => today.slice(0, 7) + "-01", [today]);

  const [du, setDu] = useState(monthStart);
  const [au, setAu] = useState(today);

  const { data, isLoading, isFetching, error } = useFetchProjectHours(du, au);

  const rowsByProject: RowProjet[] = useMemo(
    () => aggregateRows((data ?? []) as RowApi[]),
    [data]
  );

  const totalAjoutees = useMemo(
    () => rowsByProject.reduce((s, r) => s + Number(r.heuresAjoutees ?? 0), 0),
    [rowsByProject]
  );
  const totalTransferees = useMemo(
    () => rowsByProject.reduce((s, r) => s + Number(r.heuresTransferees ?? 0), 0),
    [rowsByProject]
  );

  const percentAdded = useMemo(() => {
    const tot = totalAjoutees + totalTransferees;
    if (!Number.isFinite(tot) || tot <= 0) return 0;
    return (totalAjoutees / tot) * 100;
  }, [totalAjoutees, totalTransferees]);

  // ── New analytics ──────────────────────────────────────────────────────────
  const uniqueSupervisorsCount = useMemo(
    () => new Set(rowsByProject.map((r) => r.nomSuperviseur).filter(Boolean)).size,
    [rowsByProject]
  );

  const topProjects = useMemo(
    () =>
      [...rowsByProject]
        .map((r) => ({
          name: truncate(r.nomProjet, 18),
          ajoutees: r.heuresAjoutees,
          transferees: r.heuresTransferees,
          total: r.heuresAjoutees + r.heuresTransferees,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
    [rowsByProject]
  );

  const bySupervisor = useMemo(() => {
    const map = new Map<string, { ajoutees: number; transferees: number }>();
    for (const r of rowsByProject) {
      const key = r.nomSuperviseur || "Sans superviseur";
      const ex = map.get(key) ?? { ajoutees: 0, transferees: 0 };
      ex.ajoutees += r.heuresAjoutees;
      ex.transferees += r.heuresTransferees;
      map.set(key, ex);
    }
    return [...map.entries()]
      .map(([name, v]) => ({
        name: truncate(name, 18),
        ajoutees: round2(v.ajoutees),
        transferees: round2(v.transferees),
        total: v.ajoutees + v.transferees,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [rowsByProject]);

  // ── Chart filters (bar chart per project) ─────────────────────────────────
  const [chartDate, setChartDate] = useState<string>("");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const chartDu = chartDate || du;
  const chartAu = chartDate || au;

  const {
    data: chartRaw,
    isLoading: chartLoading,
    isFetching: chartFetching,
    error: chartError,
  } = useFetchProjectHours(chartDu, chartAu);

  const rowsByProjectChart: RowProjet[] = useMemo(
    () => aggregateRows((chartRaw ?? []) as RowApi[]),
    [chartRaw]
  );

  const projectsAddedTransferred = useMemo(() => {
    const all = rowsByProjectChart.map((r) => ({
      id: r.idProjet,
      name: (r.nomProjet ?? "").toString() || `#${r.idProjet}`,
      ajoutees: Number(r.heuresAjoutees ?? 0),
      transferees: Number(r.heuresTransferees ?? 0),
    }));
    if (activeProjectId !== null) return all.filter((d) => d.id === activeProjectId);
    return all;
  }, [rowsByProjectChart, activeProjectId]);

  const handleToggleProject = (projectId: number) =>
    setActiveProjectId((prev) => (prev === projectId ? null : projectId));

  const resetChartFilters = () => {
    setChartDate("");
    setActiveProjectId(null);
  };

  // ── Table sort ─────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<"nom" | "ajoutees" | "transferees">("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: "nom" | "ajoutees" | "transferees") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir(field === "nom" ? "asc" : "desc"); }
  };

  const sortedRows = useMemo(
    () =>
      [...rowsByProject].sort((a, b) => {
        let cmp = 0;
        if (sortField === "nom")
          cmp = a.nomProjet.localeCompare(b.nomProjet, undefined, { sensitivity: "base" });
        else if (sortField === "ajoutees") cmp = a.heuresAjoutees - b.heuresAjoutees;
        else cmp = a.heuresTransferees - b.heuresTransferees;
        return sortDir === "asc" ? cmp : -cmp;
      }),
    [rowsByProject, sortField, sortDir]
  );

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!isOpManager) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-800">Accueil</h1>
      </div>
    );
  }

  if (isLoading || isFetching) return <Loader />;
  if (error) return <ErrorAlert error="Impossible de charger les statistiques." />;

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#6b7a12]">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Heures ajoutées / transférées par projet — permutations acceptées
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-500">Du</div>
            <input
              type="date"
              value={du}
              onChange={(e) => setDu(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#6b7a12]"
            />
          </div>
          <div className="text-slate-300 text-lg font-light">→</div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-500">Au</div>
            <input
              type="date"
              value={au}
              onChange={(e) => setAu(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#6b7a12]"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Cards (4) ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Heures Ajoutées"
          value={formatH(totalAjoutees)}
          color="blue"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
          }
        />
        <StatCard
          label="Heures Transférées"
          value={formatH(totalTransferees)}
          color="amber"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          }
        />
        <StatCard
          label="Projets actifs"
          value={rowsByProject.length}
          color="emerald"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          }
        />
        <StatCard
          label="Superviseurs"
          value={uniqueSupervisorsCount}
          color="violet"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
        />
      </div>

      {/* ── Charts row 1: Gauge + Barres par projet ── */}
      {chartError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">Erreur de chargement des données du graphique</p>
          <p className="mt-1 text-sm text-red-500">
            {(chartError as any)?.message || "Veuillez réessayer plus tard"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <GaugeCard
            title="Répartition Ajoutées / Transférées"
            subtitle={`Période : ${du} → ${au}`}
            percent={percentAdded}
            legendLeft="Ajoutées"
            legendRight="Transférées"
          />
          <ProjectsAddedTransferredCard
            title="Projets — Ajoutées vs Transférées"
            subtitle="Cliquez une barre pour isoler un projet"
            data={projectsAddedTransferred}
            activeProjectId={activeProjectId}
            onToggleProject={handleToggleProject}
            chartDate={chartDate}
            onChartDateChange={setChartDate}
            loading={chartLoading || chartFetching}
            onReset={resetChartFilters}
          />
        </div>
      )}

      {/* ── Charts row 2: Top projets + Superviseurs ── */}
      {rowsByProject.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TopProjectsCard data={topProjects} />
          <SupervisorAnalysisCard data={bySupervisor} />
        </div>
      )}

      {/* ── Détails table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Table header bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-sm font-semibold text-slate-900">Détails par projet</span>
            <span className="ml-2 text-xs text-slate-400">{rowsByProject.length} projet{rowsByProject.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void exportProjectHoursToExcel(rowsByProject, du, au)}
              disabled={!rowsByProject.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6b7a12] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a6610] disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              Excel
            </button>
            <button
              type="button"
              onClick={() => exportProjectHoursToPdf(rowsByProject, du, au)}
              disabled={!rowsByProject.length}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              PDF
            </button>
          </div>
        </div>

        {rowsByProject.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            Aucune donnée pour cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#687818] text-white text-xs font-semibold uppercase tracking-wider">
                  <th
                    className="cursor-pointer select-none px-5 py-3.5 text-left hover:bg-[#5a6610]"
                    onClick={() => toggleSort("nom")}
                  >
                    Projet <SortIcon active={sortField === "nom"} dir={sortDir} />
                  </th>
                  <th className="px-5 py-3.5 text-left">Superviseur</th>
                  <th
                    className="cursor-pointer select-none px-5 py-3.5 text-right hover:bg-[#5a6610]"
                    onClick={() => toggleSort("ajoutees")}
                  >
                    Ajoutées <SortIcon active={sortField === "ajoutees"} dir={sortDir} />
                  </th>
                  <th
                    className="cursor-pointer select-none px-5 py-3.5 text-right hover:bg-[#5a6610]"
                    onClick={() => toggleSort("transferees")}
                  >
                    Transférées <SortIcon active={sortField === "transferees"} dir={sortDir} />
                  </th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((r, idx) => {
                  const total = round2(r.heuresAjoutees + r.heuresTransferees);
                  return (
                    <tr
                      key={r.idProjet}
                      className={`transition-colors hover:bg-slate-50 ${idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}`}
                    >
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-900">{r.nomProjet}</span>
                        <span className="ml-2 text-xs text-slate-400">#{r.idProjet}</span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">{r.nomSuperviseur || "—"}</div>
                        {r.matriculeSuperviseur && (
                          <div className="text-xs text-slate-400">
                            Mat. {r.matriculeSuperviseur}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {Number(r.heuresAjoutees ?? 0).toFixed(2)} h
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          {Number(r.heuresTransferees ?? 0).toFixed(2)} h
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-xs font-semibold text-slate-600">
                          {total.toFixed(2)} h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-[#687818]/5">
                  <td className="px-5 py-3.5 text-xs font-bold uppercase text-slate-600" colSpan={2}>
                    Totaux
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                      {formatH(totalAjoutees)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      {formatH(totalTransferees)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-xs font-bold text-slate-700">
                      {formatH(totalAjoutees + totalTransferees)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
