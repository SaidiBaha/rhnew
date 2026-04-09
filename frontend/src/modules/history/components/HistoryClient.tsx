import { useState } from "react";
import { CalendarDays, Users, TrendingUp, ChevronRight, Loader2, ChevronLeft } from "lucide-react";
import { useFetchHistorySummary } from "../hooks/useFetchHistorySummary";
import type { HistoryFilter, HistoryEmployeeSummary } from "../types";
import { buildDateRange } from "../utils/dateRange";
import { FilterBar } from "./FilterBar";
import { EmployeeHistoryDetail } from "./EmployeeHistoryDetail";

/* ── KPI card ─────────────────────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-5"
      style={{
        background: "var(--white)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: color + "18" }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          {value}
        </div>
        <div className="text-xs font-medium mt-0.5" style={{ color: "var(--text2)" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ── Employee row ─────────────────────────────────────────────────────── */
function EmployeeRow({
  emp,
  onDetail,
}: {
  emp: HistoryEmployeeSummary;
  onDetail: (matricule: string) => void;
}) {
  const total = emp.presentDays + emp.absentDays;
  const rate = total === 0 ? 0 : Math.round((emp.presentDays / total) * 1000) / 10;

  return (
    <tr className="border-b transition-colors hover:bg-[#f7f9fe]" style={{ borderColor: "var(--border)" }}>
      <td className="px-4 py-3 font-mono-data text-sm" style={{ color: "var(--text2)" }}>
        {emp.matricule}
      </td>
      <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text)" }}>
        {emp.fullName}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: "var(--text2)" }}>
        {emp.department ?? "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: "#00c48c18", color: "#00a573" }}
        >
          {emp.presentDays} j.
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: "#f03e3e18", color: "#c0392b" }}
        >
          {emp.absentDays} j.
        </span>
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: "var(--text2)" }}>
        {rate} %
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDetail(emp.matricule)}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
        >
          Voir détails
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

const PAGE_SIZE = 25;

/* ── Main component ───────────────────────────────────────────────────── */
export function HistoryClient() {
  const [filter, setFilter]         = useState<HistoryFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [selectedMatricule, setSelectedMatricule] = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(0);

  const { dateFrom, dateTo } = buildDateRange(filter, customFrom, customTo);
  const { data, isLoading }  = useFetchHistorySummary(dateFrom, dateTo);

  /* If an employee is selected → show detail view */
  if (selectedMatricule) {
    return (
      <EmployeeHistoryDetail
        matricule={selectedMatricule}
        dateFrom={dateFrom}
        dateTo={dateTo}
        filter={filter}
        customFrom={customFrom}
        customTo={customTo}
        onFilterChange={(f, cf, ct) => { setFilter(f); setCustomFrom(cf); setCustomTo(ct); }}
        onBack={() => setSelectedMatricule(null)}
      />
    );
  }

  const employees = data?.employees ?? [];
  const filtered = search.trim()
    ? employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(search.toLowerCase()) ||
          e.matricule.includes(search)
      )
    : employees;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const paginated  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          Historique Présences / Absences
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>
          Récapitulatif des présences et absences par employé
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        filter={filter}
        customFrom={customFrom}
        customTo={customTo}
        onFilterChange={(f, cf, ct) => { setFilter(f); setCustomFrom(cf); setCustomTo(ct); setPage(0); }}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total jours présents"
          value={isLoading ? "…" : (data?.totalPresent ?? 0)}
          icon={Users}
          color="var(--accent2)"
        />
        <KpiCard
          label="Total jours absents"
          value={isLoading ? "…" : (data?.totalAbsent ?? 0)}
          icon={CalendarDays}
          color="var(--accent4)"
        />
        <KpiCard
          label="Taux de présence"
          value={isLoading ? "…" : `${data?.presenceRate ?? 0} %`}
          icon={TrendingUp}
          color="var(--accent)"
        />
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--white)", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        {/* Table toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {filtered.length} employé{filtered.length > 1 ? "s" : ""}
          </span>
          <input
            type="text"
            placeholder="Rechercher matricule ou nom…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 w-64"
            style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--bg)" }}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: "var(--muted)" }}>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>
            Aucune donnée pour la période sélectionnée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  {["Matricule", "Nom complet", "Département", "Présents", "Absents", "Taux", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((emp) => (
                  <EmployeeRow
                    key={emp.matricule}
                    emp={emp}
                    onDetail={setSelectedMatricule}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            {filtered.length === 0
              ? "Aucun résultat"
              : `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} sur ${filtered.length} employé${filtered.length > 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={safePage === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40 transition-colors"
              style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
              title="Première page"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40 transition-colors"
              style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
              title="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-medium select-none" style={{ color: "var(--text2)" }}>
              Page {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40 transition-colors"
              style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
              title="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={safePage >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40 transition-colors"
              style={{ background: "var(--white)", border: "1px solid var(--border)", color: "var(--text2)" }}
              title="Dernière page"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
