import { useMemo, useState } from "react";
import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useFetchProjectHours } from "@/modules/dashboard/hooks/useFetchProjectHours";
import useAuth from "@/hooks/useAuth";

// ✅ exports
import { exportProjectHoursToExcel } from "@/modules/dashboard/utils/exportProjectHoursExcel";
import { exportProjectHoursToPdf } from "@/modules/dashboard/utils/exportProjectHoursPdf";

// ✅ NEW: weekly permutations
import { useFetchPermutationsDaily } from "@/modules/dashboard/hooks/useFetchPermutationsDaily";
import {
    getWeekRangeFrom,
    addWeeks,
    toYmd,
    buildWeekDays,
    dayLabelFR,
} from "@/modules/dashboard/utils/week";

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

/** ✅ Gauge semi-cercle “créatif” + tooltip heures exactes */
function GaugeCard({
                       title,
                       subtitle,
                       percent,
                       legendLeft,
                       legendRight,
                       hoursLeft,
                       hoursRight,
                   }: {
    title: string;
    subtitle?: string;
    percent: number; // 0..100 (part left)
    legendLeft: string;
    legendRight: string;
    hoursLeft: number;
    hoursRight: number;
}) {
    const safeLeft = Number.isFinite(hoursLeft) ? Math.max(0, hoursLeft) : 0;
    const safeRight = Number.isFinite(hoursRight) ? Math.max(0, hoursRight) : 0;

    const total = safeLeft + safeRight;

    // si total=0, on garde un rendu stable (50/50 visuel)
    const data =
        total > 0
            ? [
                { name: legendLeft, value: safeLeft },
                { name: legendRight, value: safeRight },
            ]
            : [
                { name: legendLeft, value: 1 },
                { name: legendRight, value: 1 },
            ];

    const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));

    const COLORS = ["#3b82f6", "#f59e0b"];

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
                        <Tooltip
                            isAnimationActive={false}
                            formatter={(v: any, name: any) => {
                                // ✅ afficher heures exactes
                                const vv = Number(v);
                                const hh = Number.isFinite(vv) ? vv : 0;

                                // si total=0, on veut afficher 0h même si on a mis 1/1 pour le rendu
                                if (total <= 0) return ["0.00 h", String(name)];

                                return [`${hh.toFixed(2)} h`, String(name)];
                            }}
                            labelFormatter={() => ""}
                        />
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
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-700">{formatH(safeLeft)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: "#f59e0b" }} />
                    <span className="text-slate-700">{legendRight}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-700">{formatH(safeRight)}</span>
                </div>
            </div>
        </div>
    );
}

/** ✅ Bar chart “Permutations par jour (semaine)” + boutons semaine */
function PermutationsWeekBars({
                                  title,
                                  subtitle,
                                  rangeLabel,
                                  data,
                                  onPrev,
                                  onNext,
                              }: {
    title: string;
    subtitle?: string;
    rangeLabel: string; // "YYYY-MM-DD → YYYY-MM-DD"
    data: { name: string; total: number }[];
    onPrev: () => void;
    onNext: () => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    {subtitle ? <div className="text-xs text-slate-500 mt-1">{subtitle}</div> : null}
                    <div className="mt-2 text-[11px] text-slate-500">Semaine: {rangeLabel}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        ← Semaine précédente
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        Semaine suivante →
                    </button>
                </div>
            </div>

            <div className="mt-4 h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={40} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                            formatter={(v: any) => [`${Number(v)} permutations`, ""]}
                            labelFormatter={(l: any) => String(l)}
                        />
                        <Bar dataKey="total" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
                Astuce : Lun → Dim. Les jours vides = 0.
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

    // ✅ NEW: week navigation for permutations
    const [weekCursor, setWeekCursor] = useState<Date>(() => new Date());

    const { monday, sunday } = useMemo(() => getWeekRangeFrom(weekCursor), [weekCursor]);
    const weekFrom = useMemo(() => toYmd(monday), [monday]);
    const weekTo = useMemo(() => toYmd(sunday), [sunday]);

    const { data: permsDaily, isLoading: permsLoading } = useFetchPermutationsDaily(weekFrom, weekTo);

    // ✅ bars (7 days always)
    const permsWeekBars = useMemo(() => {
        const map = new Map<string, number>();
        for (const r of permsDaily ?? []) {
            if (r?.date) map.set(r.date, Number(r.count ?? 0));
        }

        return buildWeekDays(monday).map((d) => {
            const ymd = toYmd(d);
            return {
                name: dayLabelFR(d),
                total: Number(map.get(ymd) ?? 0),
            };
        });
    }, [permsDaily, monday]);

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

            const nomProjet =
                (r.nomProjet ?? `Projet #${idProjet}`).toString().trim() || `Projet #${idProjet}`;

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

    const percentAdded = useMemo(() => {
        const tot = Number(totalAjoutees) + Number(totalTransferees);
        if (!Number.isFinite(tot) || tot <= 0) return 0;
        return (Number(totalAjoutees) / tot) * 100;
    }, [totalAjoutees, totalTransferees]);

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
                    hoursLeft={totalAjoutees}
                    hoursRight={totalTransferees}
                />

                <PermutationsWeekBars
                    title="Permutations par jour"
                    subtitle={permsLoading ? "Chargement..." : "Nombre de permutations (semaine)"}
                    rangeLabel={`${weekFrom} → ${weekTo}`}
                    data={permsWeekBars}
                    onPrev={() => setWeekCursor((d) => addWeeks(d, -1))}
                    onNext={() => setWeekCursor((d) => addWeeks(d, 1))}
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