// src/pages/HomePage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { useFetchAdminDashboard } from "@/modules/dashboard/hooks/useFetchAdminDashboard";
import type { DashboardPeriod, SupervisorPendingRow } from "@/modules/dashboard/types";
import useAuth from "@/hooks/useAuth";
import LegacyDashboard from "@/pages/LegacyDashboard";
import { useSendReminder } from "@/modules/salary-advance/hooks/useSupervisorTracking";
import { toast } from "react-hot-toast";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n ?? 0) + " TND";
}

function fmtPct(n: number) {
  return `${(n ?? 0).toFixed(1)} %`;
}

function todayTunis() {
  return new Intl.DateTimeFormat("fr-TN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Tunis",
  }).format(new Date());
}

const DEPT_COLORS = ["#2f6bff", "#00c48c", "#ff8c00", "#f03e3e", "#7F77DD", "#17a2b8"];

type DeltaProps = { value: number; unit?: string; invert?: boolean };

function Delta({ value, unit = "", invert = false }: DeltaProps) {
  if (value === 0) return <span style={{ color: "var(--muted)", fontSize: 12 }}>— stable</span>;
  const positive = invert ? value < 0 : value > 0;
  const color = positive ? "var(--accent2)" : "var(--accent4)";
  const sign = value > 0 ? "+" : "";
  return (
    <span style={{ color, fontSize: 12, fontWeight: 600 }}>
      {sign}{value}{unit} vs précédent
    </span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
  alert,
  icon,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  accent?: string;
  alert?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="ds-card"
      style={{
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        borderLeft: `3px solid ${accent ?? "var(--accent)"}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text2)",
            fontWeight: 700,
          }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: accent ?? "var(--accent)", opacity: 0.7 }}>{icon}</span>
        )}
      </div>
      <div
        className="font-mono-data"
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: alert ? "var(--accent4)" : (accent ?? "var(--text)"),
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: "var(--text)",
        borderBottom: "2px solid var(--border)",
        paddingBottom: 8,
        marginBottom: 18,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard({ h = 90 }: { h?: number }) {
  return (
    <div
      className="ds-card"
      style={{ height: h, background: "var(--border)", animation: "pulse 1.5s infinite" }}
    />
  );
}

// ─── Period pill selector ──────────────────────────────────────────────────────

const PERIODS: { label: string; value: DashboardPeriod }[] = [
  { label: "Aujourd'hui", value: "today" },
  { label: "Cette semaine", value: "week" },
  { label: "Ce mois", value: "month" },
];

function PeriodSelector({
  value,
  onChange,
}: {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            padding: "5px 14px",
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: value === p.value ? "var(--accent)" : "var(--white)",
            color: value === p.value ? "#fff" : "var(--text2)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({
  tag,
  tagColor,
  children,
  to,
}: {
  tag: string;
  tagColor: string;
  children: React.ReactNode;
  to: string;
}) {
  return (
    <div className="ds-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            background: tagColor + "22",
            color: tagColor,
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {tag}
        </span>
        <Link
          to={to}
          style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
        >
          Voir tout →
        </Link>
      </div>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { auth } = useAuth();
  const role: string = (auth?.user?.role as string) ?? "";
  const cleanRole = role.replace("ROLE_", "");

  const [period, setPeriod] = useState<DashboardPeriod>("month");

  const { data, isLoading } = useFetchAdminDashboard(period);

  // SUPERVISOR et OPERATIONAL_MANAGER → dashboard permutations / heures projet
  if (cleanRole === "SUPERVISOR" || cleanRole === "OPERATIONAL_MANAGER") {
    return <LegacyDashboard />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingBottom: 48 }}>

      {/* ── TOPBAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Dashboard RH
          </h1>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4, textTransform: "capitalize" }}>
            {todayTunis()}
          </div>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ZONE 1 — PRÉSENCE & ABSENCES
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionTitle>
          <span style={{ fontSize: 18 }}>📋</span> Présence &amp; Absences
        </SectionTitle>

        {/* KPI row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          {isLoading ? (
            [1, 2, 3, 4].map((k) => <SkeletonCard key={k} />)
          ) : (
            <>
              <KpiCard
                label="Employés actifs"
                value={String(data?.presence.totalEmployees ?? "—")}
                accent="var(--accent)"
              />
              <KpiCard
                label="Présents aujourd'hui"
                value={String(data?.presence.presentToday ?? "—")}
                accent="var(--accent2)"
                sub={<Delta value={data?.presence.deltaPresentVsPrev ?? 0} />}
              />
              <KpiCard
                label="Absents aujourd'hui"
                value={String(data?.presence.absentToday ?? "—")}
                accent="var(--accent4)"
                alert={(data?.presence.absentToday ?? 0) > 20}
                sub={<Delta value={data?.presence.deltaAbsentVsPrev ?? 0} invert />}
              />
              <KpiCard
                label="Taux de présence"
                value={fmtPct(data?.presence.rateToday ?? 0)}
                accent={(data?.presence.rateToday ?? 100) < 70 ? "var(--accent4)" : "var(--accent2)"}
                alert={(data?.presence.rateToday ?? 100) < 70}
              />
            </>
          )}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Chart 1 — Evolution */}
          <EvolutionChart data={data?.presence.chartEvolution ?? []} loading={isLoading} />

          {/* Chart 2 — By dept donut */}
          <DeptDonutChart data={data?.presence.chartByDept ?? []} loading={isLoading} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ZONE 2 — AVANCES SUR SALAIRE
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionTitle>
          <span style={{ fontSize: 18 }}>💰</span> Avances sur salaire
        </SectionTitle>

        {/* KPI row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          {isLoading ? (
            [1, 2, 3, 4].map((k) => <SkeletonCard key={k} />)
          ) : (
            <>
              <KpiCard
                label="Demandes ce mois"
                value={String(data?.advances.totalRequests ?? "—")}
                accent="var(--accent)"
                sub={<span style={{ fontSize: 12, color: "var(--muted)" }}>employés accordés</span>}
              />
              <KpiCard
                label="Montant accordé"
                value={
                  (data?.advances.totalAmountDone ?? 0) === 0
                    ? "— TND"
                    : fmtCurrency(data?.advances.totalAmountDone ?? 0)
                }
                accent="var(--accent2)"
              />
              <KpiCard
                label="En attente"
                value={String(data?.advances.enCoursCount ?? "—")}
                accent={(data?.advances.enCoursCount ?? 0) > 0 ? "var(--accent3)" : "var(--muted)"}
                alert={(data?.advances.enCoursCount ?? 0) > 5}
                sub={<span style={{ fontSize: 12, color: "var(--muted)" }}>demandes non traitées</span>}
              />
              <KpiCard
                label="Taux d'approbation"
                value={data?.advances.approvalRate == null ? "—" : fmtPct(data.advances.approvalRate)}
                accent={
                  data?.advances.approvalRate == null
                    ? "var(--muted)"
                    : data.advances.approvalRate >= 75
                    ? "var(--accent2)"
                    : data.advances.approvalRate >= 50
                    ? "var(--accent3)"
                    : "var(--accent4)"
                }
                alert={(data?.advances.approvalRate ?? 100) < 50}
              />
            </>
          )}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <AdvanceStatusChart data={data?.advances.chartStatus ?? []} loading={isLoading} />
          <DeptAvgChart data={data?.advances.chartAvgByDept ?? []} loading={isLoading} />
        </div>

        {/* Superviseurs en attente */}
        <div style={{ marginTop: 16 }}>
          <SupervisorsPendingWidget
            rows={data?.supervisorsPending ?? []}
            loading={isLoading}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ZONE 3 — ALERTES
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionTitle>
          <span style={{ fontSize: 18 }}>🔔</span> Alertes &amp; actions requises
        </SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>

          {/* Alert 1 — Absences injustifiées */}
          <AlertCard
            tag="Absences injustifiées"
            tagColor="var(--accent4)"
            to="/historique-presence?filter=unjustified"
          >
            {isLoading ? (
              <SkeletonCard h={80} />
            ) : (data?.alerts.unjustifiedAbsences ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Aucune absence injustifiée sur les 7 derniers jours.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(data?.alerts.unjustifiedAbsences ?? []).map((a) => (
                  <div
                    key={a.matricule}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{a.fullName}</span>
                    <span
                      style={{
                        background: "var(--accent4)",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "1px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {a.days} j
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AlertCard>

          {/* Alert 2 — Avances en attente */}
          <AlertCard
            tag="Avances en attente"
            tagColor="var(--accent3)"
            to="/salary-advances?filter=pending"
          >
            {isLoading ? (
              <SkeletonCard h={80} />
            ) : (data?.alerts.pendingAdvances ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Aucune avance en attente depuis plus de 24h.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(data?.alerts.pendingAdvances ?? []).map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{a.fullName}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: "var(--text2)" }}>{fmtCurrency(a.amount)}</span>
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>il y a {a.daysAgo} j</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AlertCard>

          {/* Alert 3 — Pointage */}
          <AlertCard
            tag="Pointage du jour"
            tagColor="var(--accent)"
            to="/presence-absences"
          >
            {isLoading ? (
              <SkeletonCard h={80} />
            ) : data?.alerts.lastImportDate ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    color: "var(--accent2)",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span>✓</span>
                  <span>Pointage importé</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  Dernier import : {data.alerts.lastImportDate}
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    color: "var(--accent4)",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span>⚠</span>
                  <span>Aucun pointage pour aujourd'hui</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  Aucun fichier importé pour la date du jour.
                </span>
              </div>
            )}
          </AlertCard>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ZONE 4 — TABLEAUX RÉSUMÉS
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionTitle>
          <span style={{ fontSize: 18 }}>📊</span> Résumés récents
        </SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <RecentAdvancesTable rows={data?.recentAdvances ?? []} loading={isLoading} />
          <RecentAbsencesTable rows={data?.recentAbsences ?? []} loading={isLoading} />
        </div>
      </section>
    </div>
  );
}

// ─── Supervisors pending widget ───────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    EN_ATTENTE: { label: "En attente", bg: "#fee2e2", color: "#991b1b" },
    PARTIEL:    { label: "Partiel",    bg: "#fef3c7", color: "#92400e" },
  };
  const s = map[statut] ?? { label: statut, bg: "var(--border)", color: "var(--text2)" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function SupervisorsPendingWidget({
  rows,
  loading,
}: {
  rows: SupervisorPendingRow[];
  loading: boolean;
}) {
  const sendReminder = useSendReminder();

  const handleRemind = (trackingId: string, fullName: string) => {
    sendReminder.mutate(trackingId, {
      onSuccess: () => toast.success(`Rappel envoyé à ${fullName}`),
      onError:   () => toast.error("Erreur lors de l'envoi du rappel"),
    });
  };

  return (
    <div className="ds-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          Superviseurs n'ayant pas complété les avances
        </span>
        <Link
          to="/salary-advances/suivi-superviseurs"
          style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
        >
          Voir tout →
        </Link>
      </div>

      {loading ? (
        <SkeletonCard h={100} />
      ) : rows.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent2)", fontSize: 13, fontWeight: 600 }}>
          <span>✓</span>
          <span>Tous les superviseurs ont complété leurs avances.</span>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Matricule", "Nom", "Nb employés", "Depuis le", "Statut", "Action"].map((h) => (
                  <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "var(--text2)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sinceLabel = r.importedAt
                  ? (() => {
                      const diff = Math.floor((Date.now() - new Date(r.importedAt).getTime()) / 86_400_000);
                      return diff === 0 ? "aujourd'hui" : diff === 1 ? "il y a 1 jour" : `il y a ${diff} jours`;
                    })()
                  : "—";
                return (
                  <tr key={r.trackingId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 8px", color: "var(--text2)", fontSize: 12, fontFamily: "monospace" }}>{r.supervisorMatricule}</td>
                    <td style={{ padding: "8px 8px", color: "var(--text)", fontWeight: 500 }}>{r.supervisorFullName}</td>
                    <td style={{ padding: "8px 8px", color: "var(--text2)", textAlign: "center" }}>{r.nbEmployees}</td>
                    <td style={{ padding: "8px 8px", color: "var(--text2)" }}>{sinceLabel}</td>
                    <td style={{ padding: "8px 8px" }}><StatutBadge statut={r.statut} /></td>
                    <td style={{ padding: "8px 8px" }}>
                      <button
                        onClick={() => handleRemind(r.trackingId, r.supervisorFullName)}
                        disabled={sendReminder.isPending}
                        style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
                      >
                        Relancer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Chart components ─────────────────────────────────────────────────────────

function EvolutionChart({
  data,
  loading,
}: {
  data: { date: string; present: number; absent: number; pending: number }[];
  loading: boolean;
}) {
  return (
    <div className="ds-card" style={{ padding: "18px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          Évolution présence / absence
        </span>
      </div>
      {loading ? (
        <SkeletonCard h={200} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <Tooltip
              contentStyle={{
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="present"
              name="Présents"
              stroke="#00c48c"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="absent"
              name="Absents"
              stroke="#E24B4A"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="pending"
              name="En attente"
              stroke="#EF9F27"
              strokeWidth={1.5}
              strokeDasharray="3 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const RADIAN = Math.PI / 180;
function renderCustomLabel(props: {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function DeptDonutChart({
  data,
  loading,
}: {
  data: { dept: string; absent: number }[];
  loading: boolean;
}) {
  return (
    <div className="ds-card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
        Absences par département
      </div>
      {loading ? (
        <SkeletonCard h={200} />
      ) : data.length === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
          Aucune donnée
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="absent"
              nameKey="dept"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number | undefined, name: string | undefined) => [`${v ?? 0} absent(s)`, name ?? ""]}
              contentStyle={{
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              formatter={(v) => <span style={{ fontSize: 12, color: "var(--text2)" }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function AdvanceStatusChart({
  data,
  loading,
}: {
  data: { period: string; done: number; enCours: number }[];
  loading: boolean;
}) {
  return (
    <div className="ds-card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
        Avances accordées vs en attente
      </div>
      {loading ? (
        <SkeletonCard h={200} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <Tooltip
              contentStyle={{
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="done" name="Accordées" fill="#00c48c" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="enCours" name="En attente" fill="#EF9F27" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function DeptAvgChart({
  data,
  loading,
}: {
  data: { dept: string; avgAmount: number }[];
  loading: boolean;
}) {
  return (
    <div className="ds-card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
        Montant moyen par département (TND)
      </div>
      {loading ? (
        <SkeletonCard h={200} />
      ) : data.length === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
          Aucune donnée
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 20, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text2)" }} />
            <YAxis
              type="category"
              dataKey="dept"
              width={110}
              tick={{ fontSize: 11, fill: "var(--text2)" }}
            />
            <Tooltip
              formatter={(v: number | undefined) => [fmtCurrency(v ?? 0), "Moy. accordée"]}
              contentStyle={{
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="avgAmount" fill="#7F77DD" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Recent tables ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    EN_COURS: { label: "En attente", color: "#b45309", bg: "#fef3c7" },
    DONE:     { label: "Traitée",    color: "#065f46", bg: "#d1fae5" },
  };
  const s = map[status] ?? { label: status, color: "var(--text2)", bg: "var(--border)" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}

function RecentAdvancesTable({
  rows,
  loading,
}: {
  rows: { fullName: string; amount: number; date: string; status: string }[];
  loading: boolean;
}) {
  return (
    <div className="ds-card" style={{ padding: "18px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          Dernières demandes d'avance
        </span>
        <Link
          to="/salary-advances"
          style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
        >
          Voir tout →
        </Link>
      </div>
      {loading ? (
        <SkeletonCard h={140} />
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Aucune demande récente.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Employé", "Montant", "Date", "Statut"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      color: "var(--text2)",
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s",
                  }}
                >
                  <td style={{ padding: "8px 8px", color: "var(--text)", fontWeight: 500 }}>
                    {r.fullName}
                  </td>
                  <td
                    className="font-mono-data"
                    style={{ padding: "8px 8px", color: "var(--text2)" }}
                  >
                    {fmtCurrency(r.amount)}
                  </td>
                  <td style={{ padding: "8px 8px", color: "var(--text2)" }}>{r.date}</td>
                  <td style={{ padding: "8px 8px" }}>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecentAbsencesTable({
  rows,
  loading,
}: {
  rows: { fullName: string; dept: string; date: string; absenceReason: string }[];
  loading: boolean;
}) {
  return (
    <div className="ds-card" style={{ padding: "18px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          Absences récentes
        </span>
        <Link
          to="/historique-presence"
          style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
        >
          Voir tout →
        </Link>
      </div>
      {loading ? (
        <SkeletonCard h={140} />
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Aucune absence récente.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Employé", "Département", "Date", "Motif"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      color: "var(--text2)",
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 8px", color: "var(--text)", fontWeight: 500 }}>
                    {r.fullName}
                  </td>
                  <td style={{ padding: "8px 8px", color: "var(--text2)" }}>{r.dept}</td>
                  <td style={{ padding: "8px 8px", color: "var(--text2)" }}>{r.date}</td>
                  <td style={{ padding: "8px 8px" }}>
                    <span
                      style={{
                        background: "#fee2e2",
                        color: "#b91c1c",
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {r.absenceReason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
