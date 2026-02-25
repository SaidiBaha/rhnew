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

    // 2 segments + reste (gris)
    const data = [
        { name: "left", value: p },
        { name: "right", value: 100 - p },
        { name: "rest", value: 0 }, // garde structure stable
    ];

    // couleurs: left / right / gris
    const COLORS = ["#3b82f6", "#f59e0b", "#e5e7eb"];

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    {subtitle ? <div className="text-xs text-slate-500 mt-1">{subtitle}</div> : null}
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

/** ✅ Bar chart “créatif” (Top projets) */
function TopProjectsBars({
                             title,
                             subtitle,
                             data,
                         }: {
    title: string;
    subtitle?: string;
    data: { name: string; total: number }[];
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    {subtitle ? <div className="text-xs text-slate-500 mt-1">{subtitle}</div> : null}
                </div>
            </div>

            <div className="mt-4 h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            interval={0}
                            height={48}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                            formatter={(v: any) => formatH(Number(v))}
                            labelFormatter={(l: any) => String(l)}
                        />
                        <Bar dataKey="total" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
                Astuce : c’est le total (ajoutées + transférées).
            </div>
        </div>
    );
}

export default function HomePage() {
    const { auth } = useAuth();
    const isOpManager = hasRole(auth, "OPERATIONAL_MANAGER");

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = useMemo(() => today.slice(0, 7) + "-01", [today]);

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

    // ✅ chart data
    const percentAdded = useMemo(() => {
        const tot = Number(totalAjoutees) + Number(totalTransferees);
        if (!Number.isFinite(tot) || tot <= 0) return 0;
        return (Number(totalAjoutees) / tot) * 100;
    }, [totalAjoutees, totalTransferees]);

    const topProjects = useMemo(() => {
        const sorted = [...rowsByProject]
            .map((r) => ({
                name: (r.nomProjet ?? "").toString().slice(0, 10) || `#${r.idProjet}`, // compact like sample
                total: round2(Number(r.heuresAjoutees ?? 0) + Number(r.heuresTransferees ?? 0)),
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 7);

        // si tout est 0, on garde quand même des barres “propres”
        return sorted.length ? sorted : [];
    }, [rowsByProject]);

    if (!isOpManager) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-slate-800">Accueil</h1>
                <p className="text-slate-500 mt-2">Dashboard réservé à OPERATIONAL_MANAGER.</p>
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

                {/* Range */}
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

            {/* ✅ Graphes créatifs AVANT le tableau */}
            <div className="grid gap-4 lg:grid-cols-2">
                <GaugeCard
                    title="Répartition Ajoutées / Transférées"
                    subtitle={`Période: ${du} → ${au}`}
                    percent={percentAdded}
                    legendLeft="Ajoutées"
                    legendRight="Transférées"
                />

                <TopProjectsBars
                    title="Top projets (total heures)"
                    subtitle="Top 7 (ajoutées + transférées)"
                    data={topProjects}
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Header table + boutons export */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold text-slate-900">Détails ({rowsByProject.length})</div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => exportProjectHoursToExcel(rowsByProject, du, au)}
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
                    <div className="p-10 text-center text-slate-400">Aucune donnée sur cette période.</div>
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
                                            <div className="text-xs text-slate-400">Matricule: {r.matriculeSuperviseur}</div>
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