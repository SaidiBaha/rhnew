// src/modules/dashboard/components/PermutationsWeekChart.tsx
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

export default function PermutationsWeekChart({
                                                  title,
                                                  subtitle,
                                                  data,
                                              }: {
    title: string;
    subtitle?: string;
    data: { label: string; count: number }[];
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
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={38} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                            formatter={(v: any) => [`${Number(v)} permutations`, ""]}
                            labelFormatter={(l: any) => String(l)}
                        />
                        <Bar dataKey="count" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
                Affichage par jour (Lun → Dim).
            </div>
        </div>
    );
}