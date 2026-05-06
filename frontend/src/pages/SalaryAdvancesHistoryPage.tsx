import { useMemo, useState } from "react";

import { ErrorAlert } from "@/components/ErrorAlert";
import { Heading } from "@/components/Heading";
import { Loader } from "@/components/Loader";
import { Separator } from "@/components/ui/Separator";
import { useFetchSalaryAdvancesHistory } from "@/lib/data/salary-advance";
import { formatSalaryAdvance } from "@/modules/salary-advance/utils";

function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function formatMonthLabel(month: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
  }).format(new Date(2026, month - 1, 1));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 2,
  }).format(value || 0);
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

const PAGE_SIZE = 15;

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div
      className="ds-card"
      style={{ padding: "18px 20px" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--text2)">
        {label}
      </div>
      <div className="mt-2 font-mono-data text-2xl font-bold" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function SupervisorCumulativeCard({
  supervisorOptions,
  selectedSupervisor,
  amount,
  onChange,
}: {
  supervisorOptions: string[];
  selectedSupervisor: string;
  amount: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="ds-card" style={{ padding: "18px 20px" }}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--text2)">
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
      <div className="mt-4 font-mono-data text-2xl font-bold text-(--accent2)">
        {amount}
      </div>
    </div>
  );
}

function SalaryAdvancesHistoryPage() {
  const { data, isLoading, error } = useFetchSalaryAdvancesHistory();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedSupervisor, setSelectedSupervisor] = useState("ALL");
  const [selectedSupervisorAmount, setSelectedSupervisorAmount] = useState("ALL");
  const [page, setPage] = useState(0);

  const rows = useMemo(
    () => (data?.data ?? []).map((salaryAdvance) => formatSalaryAdvance(salaryAdvance)),
    [data?.data]
  );
  const resolveSupervisorGroup = useMemo(
    () => buildSupervisorGroupResolver(rows),
    [rows]
  );

  const yearOptions = useMemo(
    () => [...new Set(rows.map((row) => String(row.year)))].sort((a, b) => Number(b) - Number(a)),
    [rows]
  );

  const monthOptions = useMemo(
    () => [...new Set(rows.map((row) => row.month))].sort((a, b) => a - b),
    [rows]
  );

  const supervisorOptions = useMemo(
    () =>
      [...new Set(rows.map((row) => resolveSupervisorGroup(row)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      ),
    [resolveSupervisorGroup, rows]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (Number(row.amount) <= 0) return false;

        const matchesSearch =
          !query ||
          row.employee.fullName.toLowerCase().includes(query) ||
          row.employee.matricule.toLowerCase().includes(query) ||
          row.employee.jobTitle.toLowerCase().includes(query) ||
          row.employee.supervisor.toLowerCase().includes(query) ||
          row.comment.toLowerCase().includes(query) ||
          row.createdBy.toLowerCase().includes(query) ||
          row.updatedBy.toLowerCase().includes(query);

        const matchesYear = selectedYear === "ALL" || String(row.year) === selectedYear;
        const matchesMonth = selectedMonth === "ALL" || String(row.month) === selectedMonth;
        const matchesSupervisor =
          selectedSupervisor === "ALL" ||
          resolveSupervisorGroup(row) === selectedSupervisor;

        return matchesSearch && matchesYear && matchesMonth && matchesSupervisor;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;

        return a.employee.matricule.localeCompare(b.employee.matricule, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
  }, [resolveSupervisorGroup, rows, search, selectedYear, selectedMonth, selectedSupervisor]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const currentMonthAmount = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return filteredRows
      .filter((row) => row.month === currentMonth && row.year === currentYear)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }, [filteredRows]);
  const totalAmount = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [filteredRows]
  );
  const selectedSupervisorOptions = useMemo(
    () => supervisorOptions,
    [supervisorOptions]
  );
  const selectedSupervisorAmountValue = useMemo(() => {
    if (selectedSupervisorAmount === "ALL") return "Choisir un superviseur";

    const total = rows
      .filter((row) => Number(row.amount) > 0)
      .filter((row) => resolveSupervisorGroup(row) === selectedSupervisorAmount)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return formatCurrency(total);
  }, [resolveSupervisorGroup, rows, selectedSupervisorAmount]);
  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorAlert error="Impossible de charger l'historique des avances." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading
          title="Historique des avances"
          description="Consulter la liste complète des avances sur salaire."
        />
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Total affiché" value={filteredRows.length} tone="var(--navy)" />
        <MiniStat
          label="Montant mois courant"
          value={formatCurrency(currentMonthAmount)}
          tone="var(--accent3)"
        />
        <MiniStat label="Montant cumulé" value={formatCurrency(totalAmount)} tone="var(--accent)" />
        <SupervisorCumulativeCard
          supervisorOptions={selectedSupervisorOptions}
          selectedSupervisor={selectedSupervisorAmount}
          amount={selectedSupervisorAmountValue}
          onChange={setSelectedSupervisorAmount}
        />
      </div>

      <div className="ds-card space-y-6" style={{ padding: "24px 26px" }}>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-semibold text-(--text)">
              Filtres d'affichage
            </h3>
            <p className="text-sm text-(--text2)">
              Retrouvez rapidement une avance par période, superviseur ou employé.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-(--text2)">Recherche</label>
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Nom, matricule, poste, commentaire..."
                className="ds-input h-10 min-w-[260px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-(--text2)">Année</label>
              <select
                value={selectedYear}
                onChange={(event) => {
                  setSelectedYear(event.target.value);
                  setPage(0);
                }}
                className="ds-input h-10 min-w-[120px]"
              >
                <option value="ALL">Toutes</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-(--text2)">Mois</label>
              <select
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setPage(0);
                }}
                className="ds-input h-10 min-w-[140px]"
              >
                <option value="ALL">Tous</option>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-(--text2)">Superviseur</label>
              <select
                value={selectedSupervisor}
                onChange={(event) => {
                  setSelectedSupervisor(event.target.value);
                  setPage(0);
                }}
                className="ds-input h-10 min-w-[220px]"
              >
                <option value="ALL">Tous</option>
                {supervisorOptions.map((supervisor) => (
                  <option key={supervisor} value={supervisor}>
                    {supervisor}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        <div
          className="flex flex-col gap-2 rounded-xl border px-5 py-4 text-sm text-(--text2) md:flex-row md:items-center md:justify-between"
          style={{ borderColor: "var(--border)", background: "var(--surface2)" }}
        >
          <span>
            {filteredRows.length} avance{filteredRows.length > 1 ? "s" : ""} affichée
            {filteredRows.length > 1 ? "s" : ""}
          </span>
          <span className="font-medium text-(--text)">
            Affichage par mois avec priorité aux employés ayant pris une avance
          </span>
        </div>

        <div
          className="overflow-x-auto rounded-xl border"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ background: "#f4f6f9", borderBottom: "1px solid var(--border)" }}>
                {[
                  "Période",
                  "Matricule",
                  "Employé",
                  "Poste occupé",
                  "Superviseur",
                  "Montant",
                  "Commentaire",
                  "Créée le",
                  "Créée par",
                  "Mise à jour le",
                  "Mise à jour par",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-(--text2)"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-(--text2)">
                    Aucun historique d'avance ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                paginatedRows.flatMap((row, index) => {
                  const previousRow = paginatedRows[index - 1];
                  const monthChanged =
                    !previousRow ||
                    previousRow.month !== row.month ||
                    previousRow.year !== row.year;

                  const groupRows = [];

                  if (monthChanged) {
                    groupRows.push(
                      <tr key={`month-${row.year}-${row.month}-${index}`}>
                        <td
                          colSpan={11}
                          className="px-6 py-4 text-sm font-semibold capitalize"
                          style={{
                            background: "var(--accent-light)",
                            color: "var(--text)",
                            borderTop: "1px solid var(--border)",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {formatMonthYear(row.month, row.year)}
                        </td>
                      </tr>
                    );
                  }

                  groupRows.push(
                    <tr
                      key={`${row.id}-${row.month}-${row.year}`}
                      style={{
                        background: index % 2 === 0 ? "var(--surface)" : "#f8f9fc",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <td className="px-6 py-5 capitalize text-(--text)">
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            background:
                              Number(row.amount) > 0
                                ? "rgba(255,140,0,0.10)"
                                : "rgba(154,163,184,0.14)",
                            color: Number(row.amount) > 0 ? "#c26a00" : "var(--text2)",
                          }}
                        >
                          {formatMonthYear(row.month, row.year)}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-mono-data text-(--text)">
                        {row.employee.matricule}
                      </td>
                      <td className="px-6 py-5 font-medium text-(--text)">
                        {row.employee.fullName}
                      </td>
                      <td className="px-6 py-5 text-(--text2)">{row.employee.jobTitle}</td>
                      <td className="px-6 py-5 text-(--text2)">{row.employee.supervisor || "—"}</td>
                      <td className="px-6 py-5 font-mono-data text-(--text)">
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            background:
                              Number(row.amount) > 0
                                ? "rgba(0,196,140,0.10)"
                                : "rgba(154,163,184,0.14)",
                            color: Number(row.amount) > 0 ? "#008b64" : "var(--text2)",
                          }}
                        >
                          {formatCurrency(row.amount)}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-6 py-5 text-(--text2)">
                        {row.comment || "—"}
                      </td>
                      <td className="px-6 py-5 text-(--text2)">{row.createdAt || "—"}</td>
                      <td className="px-6 py-5 text-(--text2)">{row.createdBy || "—"}</td>
                      <td className="px-6 py-5 text-(--text2)">{row.updatedAt || "—"}</td>
                      <td className="px-6 py-5 text-(--text2)">{row.updatedBy || "—"}</td>
                    </tr>
                  );

                  return groupRows;
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 0 && (
          <div
            className="flex flex-col gap-3 rounded-xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--border)", background: "var(--surface2)" }}
          >
            <p className="text-sm text-(--text2)">
              Affichage de {currentPage * PAGE_SIZE + 1} à{" "}
              {Math.min((currentPage + 1) * PAGE_SIZE, filteredRows.length)} sur{" "}
              {filteredRows.length} résultat{filteredRows.length > 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-40"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                Précédent
              </button>

              <span className="text-sm font-medium text-(--text)">
                Page {currentPage + 1} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-40"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalaryAdvancesHistoryPage;
