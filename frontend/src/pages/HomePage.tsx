// src/pages/HomePage.tsx
import { useMemo, useState } from "react";
import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useFetchProjectHours } from "@/modules/dashboard/hooks/useFetchProjectHours";
import useAuth from "@/hooks/useAuth";

// ✅ exports
import { exportProjectHoursToExcel } from "@/modules/dashboard/utils/exportProjectHoursExcel";
import { exportProjectHoursToPdf } from "@/modules/dashboard/utils/exportProjectHoursPdf";

// ✅ charts
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

/** ✅ Gauge semi-cercle “créatif” */
function GaugeCard({
  title,
  subtitle,
  percent,
  legendLeft,
  legendRight,
}: {
  title: string;
  subtitle?: string;
  percent: number; // 0..100 (part left)
  legendLeft: string;
  legendRight: string;
}) {
  const p = Math.max(0, Math.min(100, percent));

  // 2 segments + "reste" (0) pour garder structure stable
  const data = [
    { name: "left", value: p },
    { name: "right", value: 100 - p },
    { name: "rest", value: 0 },
  ];

  // couleurs: left / right / gris
  const COLORS = ["#3b82f6", "#f59e0b", "#e5e7eb"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
          ) : null}
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          {p.toFixed(0)}%
        </div>
      </div>

      <div className="mt-3 h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={58}
              outerRadius={78}
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
          <span className="h-3 w-3 rounded-full" style={{ background: "#3b82f6" }} />
          <span className="text-slate-700">{legendLeft}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: "#f59e0b" }} />
          <span className="text-slate-700">{legendRight}</span>
        </div>
      </div>
    </div>
  );
}

/** ✅ Carte “Projets — Ajoutées vs Transférées”
 * - Click sur une barre => filtre par projet (toggle)
 * - Un champ "Date" optionnel => restreint le chart à ce jour (sans impacter le reste)
 */
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
  onToggleProject: (projectId: number) => void;
  chartDate: string | "";
  onChartDateChange: (v: string) => void;
  loading?: boolean;
  onReset?: () => void;
}) {
  const ADDED_COLOR = "#3b82f6";       // bleu
  const TRANSFERRED_COLOR = "#f59e0b"; // orange

  const fadedOpacity = 0.35;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
          ) : null}
        </div>

        {/* 🎛️ Petits contrôles intégrés dans la carte */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-semibold text-slate-600">Date</div>
            <input
              type="date"
              value={chartDate}
              onChange={(e) => onChartDateChange(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#6b7a12]"
              placeholder="YYYY-MM-DD"
            />
          </div>

          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            title="Réinitialiser la date et le filtre projet"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Badge projet actif */}
      {activeProjectId !== null && (
        <div className="mt-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            Projet filtré: <strong>#{activeProjectId}</strong>
            <button
              className="text-slate-500 hover:text-slate-700"
              onClick={() => onToggleProject(activeProjectId)}
              title="Enlever le filtre projet"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      <div className="relative mt-3 h-[300px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] text-slate-500 text-sm">
            Chargement…
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              height={50}
              tickMargin={10}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              // ✅ Utiliser props.dataKey pour distinguer Ajoutées / Transférées
              formatter={(v: any, _name: any, props: any) => {
                const dk = props?.dataKey; // "ajoutees" | "transferees"
                const label = dk === "ajoutees" ? "Ajoutées" : "Transférées";
                return [`${Number(v).toFixed(2)} h`, label];
              }}
              labelFormatter={(l: any) => String(l)}
            />
            <Legend
              verticalAlign="top"
              height={20}
              wrapperStyle={{ fontSize: 12, marginBottom: 8 }}
            />

            {/* Barres groupées */}
            <Bar dataKey="ajoutees" name="Ajoutées" fill={ADDED_COLOR} radius={[6, 6, 0, 0]}>
              {data.map((d, idx) => (
                <Cell
                  key={`aj-${d.id}-${idx}`}
                  cursor="pointer"
                  fill={ADDED_COLOR}
                  fillOpacity={
                    activeProjectId === null || activeProjectId === d.id ? 1 : fadedOpacity
                  }
                  onClick={() => onToggleProject(d.id)}
                />
              ))}
            </Bar>

            <Bar dataKey="transferees" name="Transférées" fill={TRANSFERRED_COLOR} radius={[6, 6, 0, 0]}>
              {data.map((d, idx) => (
                <Cell
                  key={`tr-${d.id}-${idx}`}
                  cursor="pointer"
                  fill={TRANSFERRED_COLOR}
                  fillOpacity={
                    activeProjectId === null || activeProjectId === d.id ? 1 : fadedOpacity
                  }
                  onClick={() => onToggleProject(d.id)}
                />
              ))}
            </Bar>

            <Brush dataKey="name" height={18} stroke="#cbd5e1" travellerWidth={10} />
          </BarChart>
        </ResponsiveContainer>

        {data.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Aucun résultat pour ces filtres.
          </div>
        )}
      </div>

      <div className="mt-1 text-[11px] text-slate-500">
        Astuce : cliquez une barre pour filtrer par projet (cliquez à nouveau pour enlever le filtre).
      </div>
    </div>
  );
}

export default function HomePage() {
  const { auth } = useAuth();
  const isOpManager = hasRole(auth, "OPERATIONAL_MANAGER");

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = useMemo(() => today.slice(0, 7) + "-01", [today]);

  /** ⬆️ Filtres globaux (table, totaux, gauge) */
  const [du, setDu] = useState(monthStart);
  const [au, setAu] = useState(today);

  const { data, isLoading, isFetching, error } = useFetchProjectHours(du, au);

  // ✅ build rows 1 ligne / projet (best superviseur = max score)
  const rowsByProject: RowProjet[] = useMemo(() => {
    const rows = (data ?? []) as RowApi[];

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

      const nomProjet = (r.nomProjet ?? `Projet #${idProjet}`).toString().trim() || `Projet #${idProjet}`;

      const supId =
        r.idSuperviseur === undefined || r.idSuperviseur === null ? null : Number(r.idSuperviseur);

      const supNom = (r.nomSuperviseur ?? "").toString().trim() || (supId ? `#${supId}` : "");
      const supMat =
        r.matriculeSuperviseur === undefined || r.matriculeSuperviseur === null
          ? null
          : String(r.matriculeSuperviseur);

      const added = Number.isFinite(Number(r.heuresAjoutees)) ? Number(r.heuresAjoutees) : 0;
      const transferred = Number.isFinite(Number(r.heuresTransferees)) ? Number(r.heuresTransferees) : 0;

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
  }, [data]);

  const totalAjoutees = useMemo(
    () => rowsByProject.reduce((s, r) => s + Number(r.heuresAjoutees ?? 0), 0),
    [rowsByProject]
  );

  const totalTransferees = useMemo(
    () => rowsByProject.reduce((s, r) => s + Number(r.heuresTransferees ?? 0), 0),
    [rowsByProject]
  );

  // ✅ chart data (gauge)
  const percentAdded = useMemo(() => {
    const tot = Number(totalAjoutees) + Number(totalTransferees);
    if (!Number.isFinite(tot) || tot <= 0) return 0;
    return (Number(totalAjoutees) / tot) * 100;
  }, [totalAjoutees, totalTransferees]);

  /**
   * 🔽 Filtres LOCAUX pour la carte “Barres”
   * - chartDate : si renseignée, le chart est calculé pour ce jour (du=au=date)
   * - activeProjectId : filtre projet via clic sur barre (toggle)
   */
  const [chartDate, setChartDate] = useState<string>(""); // "" => utilise du/au globaux
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  // Période effective du chart (si chartDate vide => du/au globaux)
  const chartDu = chartDate || du;
  const chartAu = chartDate || au;

  // 🔁 Fetch dédié au chart (toujours même hook, mais période possiblement différente)
  const {
    data: chartRaw,
    isLoading: chartLoading,
    isFetching: chartFetching,
    error: chartError,
  } = useFetchProjectHours(chartDu, chartAu);

  // Construire rows pour le chart (même logique d’agrégation)
  const rowsByProjectChart: RowProjet[] = useMemo(() => {
    const rows = (chartRaw ?? []) as RowApi[];

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

      const nomProjet = (r.nomProjet ?? `Projet #${idProjet}`).toString().trim() || `Projet #${idProjet}`;

      const supId =
        r.idSuperviseur === undefined || r.idSuperviseur === null ? null : Number(r.idSuperviseur);

      const supNom = (r.nomSuperviseur ?? "").toString().trim() || (supId ? `#${supId}` : "");
      const supMat =
        r.matriculeSuperviseur === undefined || r.matriculeSuperviseur === null
          ? null
          : String(r.matriculeSuperviseur);

      const added = Number.isFinite(Number(r.heuresAjoutees)) ? Number(r.heuresAjoutees) : 0;
      const transferred = Number.isFinite(Number(r.heuresTransferees)) ? Number(r.heuresTransferees) : 0;

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
  }, [chartRaw]);

  // Construire les données pour le chart (+ id pour pouvoir cliquer/filtrer)
  const projectsAddedTransferred = useMemo(() => {
    const all = rowsByProjectChart.map((r) => ({
      id: r.idProjet,
      name: (r.nomProjet ?? "").toString() || `#${r.idProjet}`,
      ajoutees: Number(r.heuresAjoutees ?? 0),
      transferees: Number(r.heuresTransferees ?? 0),
    }));

    // Si un projet est sélectionné, ne montrer que lui
    if (activeProjectId !== null) {
      return all.filter((d) => d.id === activeProjectId);
    }
    return all;
  }, [rowsByProjectChart, activeProjectId]);

  // Toggle projet via clic sur une barre
  const handleToggleProject = (projectId: number) => {
    setActiveProjectId((prev) => (prev === projectId ? null : projectId));
  };

  // Réinitialiser date + projet actif
  const resetChartFilters = () => {
    setChartDate("");
    setActiveProjectId(null);
  };

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
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#6b7a12]">Dashboard</h1>
          <p className="text-slate-500">
            Heures ajoutées / transférées par projet (permutations acceptées)
          </p>
        </div>

        {/* Range global (table, totaux, gauge) */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-[11px] font-semibold text-slate-600 mb-1">Du</div>
            <input
              type="date"
              value={du}
              onChange={(e) => setDu(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#6b7a12]"
            />
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-600 mb-1">Au</div>
            <input
              type="date"
              value={au}
              onChange={(e) => setAu(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#6b7a12]"
            />
          </div>
        </div>
      </div>

      {/* Totaux */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total heures ajoutées</div>
          <div className="text-2xl font-bold text-slate-900">{formatH(totalAjoutees)}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total heures transférées</div>
          <div className="text-2xl font-bold text-slate-900">{formatH(totalTransferees)}</div>
        </div>
      </div>

      {/* ✅ Graphes AVANT le tableau avec gestion d'erreur */}
      {chartError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-medium">Erreur de chargement des données du graphique</p>
          <p className="text-sm text-red-500 mt-1">{chartError?.message || "Veuillez réessayer plus tard"}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <GaugeCard
            title="Répartition Ajoutées / Transférées"
            subtitle={`Période: ${du} → ${au}`}
            percent={percentAdded}
            legendLeft="Ajoutées"
            legendRight="Transférées"
          />

          <ProjectsAddedTransferredCard
            title="Projets — Ajoutées vs Transférées"
            subtitle="Clique une barre pour filtrer par projet •"
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header table + boutons export */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-900">
            Détails ({rowsByProject.length})
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void exportProjectHoursToExcel(rowsByProject, du, au)}
              disabled={!rowsByProject.length}
              className="rounded-xl bg-[#6b7a12] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a6610] disabled:opacity-60"
            >
              Export Excel
            </button>

            <button
              type="button"
              onClick={() => exportProjectHoursToPdf(rowsByProject, du, au)}
              disabled={!rowsByProject.length}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              Export PDF
            </button>
          </div>
        </div>

        {rowsByProject.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            Aucune donnée sur cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Projet</th>
                  <th className="px-5 py-3 text-left">Superviseur</th>
                  <th className="px-5 py-3 text-right">Heures ajoutées</th>
                  <th className="px-5 py-3 text-right">Heures transférées</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rowsByProject.map((r) => (
                  <tr key={r.idProjet} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-900">{r.nomProjet}</span>
                      <span className="ml-2 text-xs text-slate-400">#{r.idProjet}</span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{r.nomSuperviseur}</div>
                      {r.matriculeSuperviseur && (
                        <div className="text-xs text-slate-400">
                          Matricule: {r.matriculeSuperviseur}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-emerald-700">
                      {Number(r.heuresAjoutees ?? 0).toFixed(2)} h
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-amber-700">
                      {Number(r.heuresTransferees ?? 0).toFixed(2)} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}