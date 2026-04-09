import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/Loader";
import { useFetchSalaryAdvancesHistory } from "@/lib/data/salary-advance";
import { formatSalaryAdvance } from "@/modules/salary-advance/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, month - 1, 1));
}

function buildSupervisorGroupResolver<
  T extends { employee: { fullName: string; supervisor: string } }
>(rows: T[]) {
  const supervisorNames = new Set(
    rows.map((row) => row.employee.supervisor).filter(Boolean)
  );

  return (row: T) =>
    supervisorNames.has(row.employee.fullName)
      ? row.employee.fullName
      : row.employee.supervisor;
}

function MiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="ds-card p-5" style={{ minHeight: "150px" }}>
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-3)",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        className="mt-2 font-mono-data"
        style={{ fontSize: "24px", fontWeight: 700, color: tone }}
      >
        {value}
      </div>
    </div>
  );
}

function SupervisorCumulativeCard({
  supervisorOptions,
  selectedSupervisor,
  amount,
  showAmount,
  onChange,
}: {
  supervisorOptions: string[];
  selectedSupervisor: string;
  amount: string;
  showAmount: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="ds-card p-5"
      style={{
        minHeight: "320px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-3)",
          fontWeight: 700,
        }}
      >
        Montant par superviseur
      </div>
      <select
        value={selectedSupervisor}
        onChange={(event) => onChange(event.target.value)}
        className="ds-input mt-3 h-10 w-full"
      >
        <option value="ALL">Choisir un superviseur</option>
        {supervisorOptions.map((supervisor) => (
          <option key={supervisor} value={supervisor}>
            {supervisor}
          </option>
        ))}
      </select>
      {showAmount ? (
        <div
          className="mt-3 font-mono-data"
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--accent2)",
            minHeight: "36px",
            marginTop: "auto",
            marginBottom: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            flex: 1,
          }}
        >
          {amount}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSalaryAdvanceDashboardCard() {
  const historyQuery = useFetchSalaryAdvancesHistory(true);
  const [selectedSupervisorAmount, setSelectedSupervisorAmount] = useState("ALL");

  const historyRows = useMemo(
    () => (historyQuery.data?.data ?? []).map((salaryAdvance) => formatSalaryAdvance(salaryAdvance)),
    [historyQuery.data?.data]
  );

  const rowsWithAdvance = useMemo(
    () => historyRows.filter((row) => Number(row.amount) > 0),
    [historyRows]
  );
  const resolveSupervisorGroup = useMemo(
    () => buildSupervisorGroupResolver(historyRows),
    [historyRows]
  );

  const stats = useMemo(() => {
    const totalAmount = rowsWithAdvance.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentMonthAmount = rowsWithAdvance
      .filter((row) => row.month === currentMonth && row.year === currentYear)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const uniqueEmployees = new Set(
      rowsWithAdvance.map((row) => row.employee.matricule)
    ).size;

    const uniqueSupervisors = new Set(
      rowsWithAdvance.map((row) => resolveSupervisorGroup(row)).filter(Boolean)
    ).size;

    const monthlyMap = new Map<string, { label: string; count: number; amount: number }>();
    rowsWithAdvance.forEach((row) => {
      const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
      const existing = monthlyMap.get(key);

      if (existing) {
        existing.count += 1;
        existing.amount += Number(row.amount || 0);
        return;
      }

      monthlyMap.set(key, {
        label: formatMonthYear(row.month, row.year),
        count: 1,
        amount: Number(row.amount || 0),
      });
    });

    const monthly = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([, value]) => value);

    const supervisorMap = new Map<string, { name: string; amount: number }>();
    rowsWithAdvance.forEach((row) => {
      const key = resolveSupervisorGroup(row) || "Sans superviseur";
      const existing = supervisorMap.get(key);

      if (existing) {
        existing.amount += Number(row.amount || 0);
        return;
      }

      supervisorMap.set(key, {
        name: key,
        amount: Number(row.amount || 0),
      });
    });

    const supervisorsByAmount = [...supervisorMap.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    return {
      currentMonthAmount,
      totalAmount,
      uniqueEmployees,
      uniqueSupervisors,
      monthly,
      supervisorsByAmount,
    };
  }, [resolveSupervisorGroup, rowsWithAdvance]);

  const supervisorOptions = useMemo(
    () =>
      [...new Set(rowsWithAdvance.map((row) => resolveSupervisorGroup(row)).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })
      ),
    [resolveSupervisorGroup, rowsWithAdvance]
  );

  const selectedSupervisorAmountValue = useMemo(() => {
    if (selectedSupervisorAmount === "ALL") return "Choisir un superviseur";

    const total = rowsWithAdvance
      .filter((row) => resolveSupervisorGroup(row) === selectedSupervisorAmount)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return formatCurrency(total);
  }, [resolveSupervisorGroup, rowsWithAdvance, selectedSupervisorAmount]);

  if (historyQuery.isLoading) {
    return <Loader />;
  }

  if (historyQuery.error) {
    return <ErrorAlert error="Impossible de charger les statistiques des avances." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:auto-rows-fr">
        <MiniCard
          label="Montant mois courant"
          value={formatCurrency(stats.currentMonthAmount)}
          tone="var(--accent3)"
        />
        <MiniCard
          label="Montant cumulé"
          value={formatCurrency(stats.totalAmount)}
          tone="var(--accent)"
        />
        <div className="xl:row-span-2">
          <SupervisorCumulativeCard
            supervisorOptions={supervisorOptions}
            selectedSupervisor={selectedSupervisorAmount}
            amount={selectedSupervisorAmountValue}
            showAmount={selectedSupervisorAmount !== "ALL"}
            onChange={setSelectedSupervisorAmount}
          />
        </div>
        <MiniCard
          label="Employés concernés"
          value={stats.uniqueEmployees}
          tone="#b45309"
        />
        <MiniCard
          label="Superviseurs concernés"
          value={stats.uniqueSupervisors}
          tone="#15803d"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ds-card p-5">
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
            Avances par mois
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
            Nombre d'avances réellement prises
          </div>
          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(value) => [Number(value ?? 0), "Avances"]} />
                <Bar dataKey="count" name="Avances" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ds-card p-5">
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
            Montants par mois
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
            Somme mensuelle des avances accordées
          </div>
          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), "Montant"]} />
                <Bar dataKey="amount" name="Montant" fill="var(--accent2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="ds-card p-5">
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>
            Montant par superviseur
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
            Les superviseurs avec le plus grand montant cumulé
          </div>
          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.supervisorsByAmount} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={150} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), "Montant"]} />
                <Bar dataKey="amount" name="Montant" fill="var(--accent3)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
