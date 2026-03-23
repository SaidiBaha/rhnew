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
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { useFetchPermutations } from "@/modules/permutation/hooks/useFetchPermutations";
import type { Permutation } from "@/modules/permutation/types";

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
  color: "navy" | "teal" | "accent" | "green" | "red";
  icon: React.ReactNode;
}) {
  const palette = {
    navy:   { border: "var(--navy)",   iconBg: "rgba(26,35,50,0.08)",   iconColor: "var(--navy)" },
    teal:   { border: "var(--teal)",   iconBg: "var(--teal-soft)",       iconColor: "var(--teal)" },
    accent: { border: "var(--accent)", iconBg: "var(--accent-soft)",     iconColor: "var(--accent)" },
    green:  { border: "var(--green)",  iconBg: "var(--green-soft)",      iconColor: "var(--green)" },
    red:    { border: "var(--red)",    iconBg: "var(--red-soft)",        iconColor: "var(--red)" },
  }[color];

  return (
    <div
      className="ds-stat-card"
      style={{ borderLeft: `4px solid ${palette.border}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--text-3)",
          }}
        >
          {label}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ background: palette.iconBg, color: palette.iconColor }}
        >
          {icon}
        </span>
      </div>
      <div
        className="font-mono-data"
        style={{ fontSize: "28px", fontWeight: 600, color: "var(--text-1)", lineHeight: 1 }}
      >
        {value}
      </div>
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
  const COLORS = ["#0d7ea8", "#e85d26", "#e8ecf2"];

  return (
    <div className="ds-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>{subtitle}</div>}
        </div>
        <div
          className="font-mono-data rounded-md px-3 py-1.5"
          style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)", background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
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
              formatter={(value: number | undefined, name: string | undefined) => {
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

      <div className="mt-2 flex items-center justify-center gap-6" style={{ fontSize: "12px" }}>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: "var(--teal)" }} />
          <span style={{ color: "var(--text-2)" }}>{legendLeft}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: "var(--accent)" }} />
          <span style={{ color: "var(--text-2)" }}>{legendRight}</span>
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
    <div className="ds-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={chartDate}
            onChange={(e) => onChartDateChange(e.target.value)}
            className="ds-input font-mono-data"
          />
          <button
            type="button"
            onClick={onReset}
            className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: "var(--surface2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {activeProjectId !== null && (
        <div className="mt-2">
          <span
            className="inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs"
            style={{ background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid #b3ddf0" }}
          >
            Filtre actif : <strong>#{activeProjectId}</strong>
            <button onClick={() => onToggleProject(activeProjectId)} className="hover:opacity-70">✕</button>
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
    <div className="ds-card p-5">
      <div className="mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>Top projets — heures totales</div>
      <div className="mb-3" style={{ fontSize: "11px", color: "var(--text-3)" }}>
        Classement par volume d'heures cumulées (ajoutées + transférées)
      </div>

      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm" style={{ color: "var(--text-3)" }}>
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
                contentStyle={{ borderRadius: "6px", fontSize: "12px", border: "1px solid var(--border)" }}
              />
              <Legend verticalAlign="top" height={22} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ajoutees" name="Ajoutées" fill="#0d7ea8" radius={[0, 0, 0, 0]} stackId="s" />
              <Bar dataKey="transferees" name="Transférées" fill="#e85d26" radius={[0, 4, 4, 0]} stackId="s" />
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
    <div className="ds-card p-5">
      <div className="mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>Analyse par superviseur</div>
      <div className="mb-3" style={{ fontSize: "11px", color: "var(--text-3)" }}>
        Heures ajoutées et transférées par superviseur (top 8)
      </div>

      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm" style={{ color: "var(--text-3)" }}>
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
                contentStyle={{ borderRadius: "6px", fontSize: "12px", border: "1px solid var(--border)" }}
              />
              <Legend verticalAlign="top" height={22} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ajoutees" name="Ajoutées" fill="#1a9e6a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="transferees" name="Transférées" fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Supervisor Permutation Dashboard components ──────────────────────────────

function PermStatusPieCard({ permutations }: { permutations: Permutation[] }) {
  const statusData = useMemo(() =>
    [
      { name: "En attente", value: permutations.filter(p => p.status === "EN_ATTENTE").length, color: "#d97706" },
      { name: "Acceptées",  value: permutations.filter(p => p.status === "ACCEPTEE").length,  color: "#1a9e6a" },
      { name: "Refusées",   value: permutations.filter(p => p.status === "REFUSEE").length,   color: "#c8333a" },
    ].filter(d => d.value > 0),
  [permutations]);

  return (
    <div className="ds-card p-5">
      <div className="mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
        Répartition par statut
      </div>
      <div className="mb-3" style={{ fontSize: "11px", color: "var(--text-3)" }}>
        {permutations.length} permutation{permutations.length !== 1 ? "s" : ""} au total
      </div>
      {statusData.length === 0 ? (
        <div className="flex h-[210px] items-center justify-center text-sm" style={{ color: "var(--text-3)" }}>
          Aucune donnée disponible
        </div>
      ) : (
        <div className="h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                cx="50%" cy="50%"
                innerRadius={58} outerRadius={82}
                paddingAngle={3}
                stroke="transparent"
              >
                {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [v, name]}
                contentStyle={{ borderRadius: "0.5rem", fontSize: "12px", border: "1px solid var(--border)" }}
              />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PermTypeBarCard({ permutations }: { permutations: Permutation[] }) {
  const data = useMemo(() => [
    {
      name: "Envoyées",
      "En attente": permutations.filter(p => p.typePermutation === "ENVOYER" && p.status === "EN_ATTENTE").length,
      "Acceptées":  permutations.filter(p => p.typePermutation === "ENVOYER" && p.status === "ACCEPTEE").length,
      "Refusées":   permutations.filter(p => p.typePermutation === "ENVOYER" && p.status === "REFUSEE").length,
    },
    {
      name: "Reçues",
      "En attente": permutations.filter(p => p.typePermutation === "RECEVOIR" && p.status === "EN_ATTENTE").length,
      "Acceptées":  permutations.filter(p => p.typePermutation === "RECEVOIR" && p.status === "ACCEPTEE").length,
      "Refusées":   permutations.filter(p => p.typePermutation === "RECEVOIR" && p.status === "REFUSEE").length,
    },
  ], [permutations]);

  return (
    <div className="ds-card p-5">
      <div className="mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
        Envoyées vs Reçues
      </div>
      <div className="mb-3" style={{ fontSize: "11px", color: "var(--text-3)" }}>
        Répartition par type et statut
      </div>
      <div className="h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: "0.5rem", fontSize: "12px", border: "1px solid var(--border)" }} />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="En attente" fill="#d97706" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Acceptées"  fill="#1a9e6a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Refusées"   fill="#c8333a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PermTimelineCard({ permutations }: { permutations: Permutation[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of permutations) {
      if (p.startDate) map.set(p.startDate, (map.get(p.startDate) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [permutations]);

  return (
    <div className="ds-card p-5">
      <div className="mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
        Permutations par date
      </div>
      <div className="mb-3" style={{ fontSize: "11px", color: "var(--text-3)" }}>
        Nombre de permutations selon la date de début
      </div>
      {data.length === 0 ? (
        <div className="flex h-[185px] items-center justify-center text-sm" style={{ color: "var(--text-3)" }}>
          Aucune donnée disponible
        </div>
      ) : (
        <div className="h-[185px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="permGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0d7ea8" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0d7ea8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                formatter={(v: any) => [v, "Permutations"]}
                contentStyle={{ borderRadius: "0.5rem", fontSize: "12px", border: "1px solid var(--border)" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0d7ea8"
                strokeWidth={2}
                fill="url(#permGradient)"
                dot={{ r: 3, fill: "#0d7ea8", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name="Permutations"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PermOperatorsCard({ permutations, total }: { permutations: Permutation[]; total: number }) {
  const { avgOps, maxOps, distData } = useMemo(() => {
    if (permutations.length === 0) return { avgOps: 0, maxOps: 0, distData: [] };
    const counts = permutations.map(p => p.operatorIds.length);
    const avgOps = Math.round((counts.reduce((s, c) => s + c, 0) / permutations.length) * 10) / 10;
    const maxOps = Math.max(...counts);
    const distMap = new Map<number, number>();
    for (const c of counts) distMap.set(c, (distMap.get(c) ?? 0) + 1);
    const distData = [...distMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([ops, perms]) => ({ name: `${ops} op.`, perms }));
    return { avgOps, maxOps, distData };
  }, [permutations]);

  return (
    <div className="ds-card p-5">
      <div className="mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
        Opérateurs impliqués
      </div>
      <div className="mb-3 flex gap-5" style={{ fontSize: "11px", color: "var(--text-3)" }}>
        <span>Total : <strong style={{ color: "var(--text-2)" }}>{total}</strong></span>
        <span>Moy./perm. : <strong style={{ color: "var(--text-2)" }}>{avgOps}</strong></span>
        <span>Max : <strong style={{ color: "var(--text-2)" }}>{maxOps}</strong></span>
      </div>
      {distData.length === 0 ? (
        <div className="flex h-[155px] items-center justify-center text-sm" style={{ color: "var(--text-3)" }}>
          Aucune donnée disponible
        </div>
      ) : (
        <div className="h-[155px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                formatter={(v: any) => [v, "Permutations"]}
                contentStyle={{ borderRadius: "0.5rem", fontSize: "12px", border: "1px solid var(--border)" }}
              />
              <Bar dataKey="perms" name="Permutations" fill="#e85d26" radius={[4, 4, 0, 0]} />
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
  const isOpManager  = hasRole(auth, "OPERATIONAL_MANAGER");
  const isSupervisor = hasRole(auth, "SUPERVISOR");
  const isAdmin      = !isOpManager && !isSupervisor;

  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = useMemo(() => today.slice(0, 7) + "-01", [today]);

  // ── Supervisor / OpManager only: permutation data ────────────────────────────
  const { data: rawPermutations, isLoading: permLoading } = useFetchPermutations(isSupervisor || isOpManager);

  const [permDateFrom,    setPermDateFrom]    = useState(monthStart);
  const [permDateTo,      setPermDateTo]      = useState(today);
  const [permStatusFilter, setPermStatusFilter] = useState<"ALL" | "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE">("ALL");
  const [permTypeFilter,  setPermTypeFilter]  = useState<"ALL" | "ENVOYER" | "RECEVOIR">("ALL");

  const filteredPermutations = useMemo(() => {
    const perms = rawPermutations ?? [];
    return perms.filter(p => {
      if (permStatusFilter !== "ALL" && p.status          !== permStatusFilter) return false;
      if (permTypeFilter   !== "ALL" && p.typePermutation !== permTypeFilter)   return false;
      if (permDateFrom && p.startDate < permDateFrom) return false;
      if (permDateTo   && p.startDate > permDateTo)   return false;
      return true;
    });
  }, [rawPermutations, permStatusFilter, permTypeFilter, permDateFrom, permDateTo]);

  const permTotal     = filteredPermutations.length;
  const permEnAttente = filteredPermutations.filter(p => p.status === "EN_ATTENTE").length;
  const permAcceptees = filteredPermutations.filter(p => p.status === "ACCEPTEE").length;
  const permRefusees  = filteredPermutations.filter(p => p.status === "REFUSEE").length;
  const permTotalOps  = filteredPermutations.reduce((s, p) => s + p.operatorIds.length, 0);

  const [du, setDu] = useState(monthStart);
  const [au, setAu] = useState(today);

  const { data, isLoading, isFetching, error } = useFetchProjectHours(du, au, isAdmin || isOpManager);

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
  } = useFetchProjectHours(chartDu, chartAu, isAdmin || isOpManager);

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
    if (isSupervisor) {
      if (permLoading) return <Loader />;
      return (
        <div className="space-y-5">
          {/* ── Header + Filtres ── */}
          <div
            className="ds-card px-6 py-4"
            style={{ position: "relative", overflow: "hidden", borderBottom: "2px solid var(--border)" }}
          >
            <div
              className="absolute bottom-0 left-0 h-0.5 w-48"
              style={{ background: "linear-gradient(to right, var(--accent), transparent)" }}
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "4px" }}>
                  Accueil
                  <span className="mx-2" style={{ color: "var(--border-mid)" }}>/</span>
                  <span style={{ color: "var(--text-2)" }}>Mes Permutations</span>
                </div>
                <h1 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", lineHeight: 1.2 }}>
                  Dashboard Permutations
                </h1>
                <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                  Statistiques de vos permutations d'opérateurs
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Du</span>
                  <input
                    type="date"
                    value={permDateFrom}
                    onChange={e => setPermDateFrom(e.target.value)}
                    className="ds-input font-mono-data"
                  />
                </div>
                <span style={{ color: "var(--border-mid)" }}>→</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Au</span>
                  <input
                    type="date"
                    value={permDateTo}
                    onChange={e => setPermDateTo(e.target.value)}
                    className="ds-input font-mono-data"
                  />
                </div>
                <select
                  value={permStatusFilter}
                  onChange={e => setPermStatusFilter(e.target.value as typeof permStatusFilter)}
                  className="ds-input"
                >
                  <option value="ALL">Tous statuts</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="ACCEPTEE">Acceptées</option>
                  <option value="REFUSEE">Refusées</option>
                </select>
                <select
                  value={permTypeFilter}
                  onChange={e => setPermTypeFilter(e.target.value as typeof permTypeFilter)}
                  className="ds-input"
                >
                  <option value="ALL">Tous types</option>
                  <option value="ENVOYER">Envoyées</option>
                  <option value="RECEVOIR">Reçues</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setPermDateFrom(monthStart);
                    setPermDateTo(today);
                    setPermStatusFilter("ALL");
                    setPermTypeFilter("ALL");
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ background: "var(--surface2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total permutations"
              value={permTotal}
              color="navy"
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              }
            />
            <StatCard
              label="En attente"
              value={permEnAttente}
              color="accent"
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />
            <StatCard
              label="Acceptées"
              value={permAcceptees}
              color="green"
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
            />
            <StatCard
              label="Refusées"
              value={permRefusees}
              color="red"
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              }
            />
          </div>

          {/* ── Charts row 1: Statut Pie + Type Bar ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <PermStatusPieCard permutations={filteredPermutations} />
            <PermTypeBarCard   permutations={filteredPermutations} />
          </div>

          {/* ── Charts row 2: Timeline + Opérateurs ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <PermTimelineCard  permutations={filteredPermutations} />
            <PermOperatorsCard permutations={filteredPermutations} total={permTotalOps} />
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--navy)" }}>Accueil</h1>
      </div>
    );
  }

  if (isLoading || isFetching) return <Loader />;
  if (error) return <ErrorAlert error="Impossible de charger les statistiques." />;

  return (
    <div className="space-y-5">
      {/* ── Header card ── */}
      <div
        className="ds-card px-6 py-4"
        style={{ position: "relative", overflow: "hidden", borderBottom: "2px solid var(--border)" }}
      >
        <div className="absolute bottom-0 left-0 h-0.5 w-48" style={{ background: "linear-gradient(to right, var(--accent), transparent)" }} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "4px" }}>
              Accueil
              <span className="mx-2" style={{ color: "var(--border-mid)" }}>/</span>
              <span style={{ color: "var(--text-2)" }}>Dashboard</span>
            </div>
            <h1 style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy)", lineHeight: 1.2 }}>Dashboard</h1>
            <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
              Heures ajoutées / transférées par projet — permutations acceptées
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Du</span>
              <input
                type="date"
                value={du}
                onChange={(e) => setDu(e.target.value)}
                className="ds-input font-mono-data"
              />
            </div>
            <span style={{ color: "var(--border-mid)" }}>→</span>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Au</span>
              <input
                type="date"
                value={au}
                onChange={(e) => setAu(e.target.value)}
                className="ds-input font-mono-data"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards (4) ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Heures Ajoutées"
          value={formatH(totalAjoutees)}
          color="teal"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
          }
        />
        <StatCard
          label="Heures Transférées"
          value={formatH(totalTransferees)}
          color="accent"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          }
        />
        <StatCard
          label="Projets actifs"
          value={rowsByProject.length}
          color="green"
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
          color="navy"
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
        <div
          className="rounded-lg p-6 text-center"
          style={{ background: "var(--red-soft)", border: "1px solid rgba(200,51,58,0.20)" }}
        >
          <p style={{ fontWeight: 600, color: "var(--red)" }}>Erreur de chargement des données du graphique</p>
          <p className="mt-1 text-sm" style={{ color: "var(--red)" }}>
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
      <div className="ds-card overflow-hidden">
        {/* Table header bar */}
        <div
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>Détails par projet</span>
            <span className="ml-2" style={{ fontSize: "11px", color: "var(--text-3)" }}>
              {rowsByProject.length} projet{rowsByProject.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void exportProjectHoursToExcel(rowsByProject, du, au)}
              disabled={!rowsByProject.length}
              className="ds-btn-primary disabled:opacity-50"
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
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--navy)" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              PDF
            </button>
          </div>
        </div>

        {rowsByProject.length === 0 ? (
          <div className="p-10 text-center" style={{ color: "var(--text-3)" }}>
            Aucune donnée pour cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table min-w-full text-sm">
              <thead>
                <tr>
                  <th
                    className="cursor-pointer select-none text-left transition-colors hover:bg-[#ebeef3]"
                    onClick={() => toggleSort("nom")}
                  >
                    Projet <SortIcon active={sortField === "nom"} dir={sortDir} />
                  </th>
                  <th className="text-left">Superviseur</th>
                  <th
                    className="cursor-pointer select-none text-right transition-colors hover:bg-[#ebeef3]"
                    onClick={() => toggleSort("ajoutees")}
                  >
                    Ajoutées <SortIcon active={sortField === "ajoutees"} dir={sortDir} />
                  </th>
                  <th
                    className="cursor-pointer select-none text-right transition-colors hover:bg-[#ebeef3]"
                    onClick={() => toggleSort("transferees")}
                  >
                    Transférées <SortIcon active={sortField === "transferees"} dir={sortDir} />
                  </th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((r, idx) => {
                  const total = round2(r.heuresAjoutees + r.heuresTransferees);
                  return (
                    <tr
                      key={r.idProjet}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        animationDelay: `${idx * 0.03}s`,
                      }}
                    >
                      <td className="px-5 py-4">
                        <span style={{ fontWeight: 600, color: "var(--text-1)" }}>{r.nomProjet}</span>
                        <span
                          className="ml-2 font-mono-data"
                          style={{ fontSize: "10px", color: "var(--text-3)" }}
                        >
                          #{r.idProjet}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div style={{ fontWeight: 500, color: "var(--text-1)" }}>{r.nomSuperviseur || "—"}</div>
                        {r.matriculeSuperviseur && (
                          <div
                            className="font-mono-data"
                            style={{ fontSize: "10px", color: "var(--text-3)" }}
                          >
                            #{r.matriculeSuperviseur}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className="font-mono-data inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold"
                          style={{ background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid #b3ddf0" }}
                        >
                          {Number(r.heuresAjoutees ?? 0).toFixed(2)} h
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className="font-mono-data inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(232,93,38,0.25)" }}
                        >
                          {Number(r.heuresTransferees ?? 0).toFixed(2)} h
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className="font-mono-data text-xs font-semibold"
                          style={{ color: "var(--text-2)" }}
                        >
                          {total.toFixed(2)} h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)", background: "var(--surface2)" }}>
                  <td
                    className="px-5 py-3"
                    colSpan={2}
                    style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)" }}
                  >
                    Totaux
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className="font-mono-data inline-flex items-center rounded px-2.5 py-1 text-xs font-bold"
                      style={{ background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid #b3ddf0" }}
                    >
                      {formatH(totalAjoutees)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className="font-mono-data inline-flex items-center rounded px-2.5 py-1 text-xs font-bold"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(232,93,38,0.25)" }}
                    >
                      {formatH(totalTransferees)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className="font-mono-data text-xs font-bold"
                      style={{ color: "var(--text-2)" }}
                    >
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
