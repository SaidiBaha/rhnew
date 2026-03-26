import { useState, useMemo } from "react";
import { Plus, LayoutGrid, Table2 } from "lucide-react";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { DataTable } from "@/components/ui/DataTable";
import { columns, type RequestColumn } from "@/modules/request/components/columns";
import { SaveRequestModal } from "@/modules/request/components/SaveRequestModal";
import { RequestKanban } from "@/modules/request/components/RequestKanban";
import { RequestStatuses, type RequestStatus } from "@/modules/request/types";

interface RequestsClientProps {
  data: RequestColumn[];
}

const today = new Date().toISOString().slice(0, 10);

const STATUS_COLORS: Record<RequestStatus, string> = {
  SOUMIS:  "bg-blue-100 text-blue-700 border-blue-200",
  TRAITÉ:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJETÉ:  "bg-red-100 text-red-700 border-red-200",
  CLÔTURÉ: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_ACTIVE: Record<RequestStatus, string> = {
  SOUMIS:  "bg-blue-500 text-white border-blue-500",
  TRAITÉ:  "bg-emerald-600 text-white border-emerald-600",
  REJETÉ:  "bg-red-500 text-white border-red-500",
  CLÔTURÉ: "bg-gray-500 text-white border-gray-500",
};

export function RequestsClient({ data }: RequestsClientProps) {
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [view, setView]                     = useState<"kanban" | "table">("kanban");
  const [dateFrom, setDateFrom]             = useState<string>(today);
  const [dateTo, setDateTo]                 = useState<string>(today);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const baseFiltered = useMemo(() => {
    return data.filter((request) => {
      const createdAtStr = request.createdAtLocalStr;
      const from = dateFrom || "0000-01-01";
      const to   = dateTo   || "9999-12-31";
      if (createdAtStr < from || createdAtStr > to) return false;

      if (employeeSearch.trim()) {
        const q = employeeSearch.trim().toLowerCase();
        const matchName      = request.employee.fullName.toLowerCase().includes(q);
        const matchMatricule = request.employee.matricule.toLowerCase().includes(q);
        if (!matchName && !matchMatricule) return false;
      }

      return true;
    });
  }, [data, dateFrom, dateTo, employeeSearch]);

  const tableFiltered = useMemo(() => {
    if (!selectedStatus) return baseFiltered;
    return baseFiltered.filter((r) => r.status === selectedStatus);
  }, [baseFiltered, selectedStatus]);

  function resetFilters() {
    setDateFrom(today);
    setDateTo(today);
    setEmployeeSearch("");
    setSelectedStatus(null);
  }

  return (
    <>
      <SaveRequestModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Heading
          title={`Demandes (${view === "kanban" ? baseFiltered.length : tableFiltered.length})`}
          description={"Gérer les demandes."}
        />

        <div className="flex items-center gap-x-2">
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                view === "kanban"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid className="size-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-gray-200 ${
                view === "table"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Table2 className="size-4" />
              Tableau
            </button>
          </div>

          <button
            type="button"
            className="ds-btn-primary"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="size-4" />
            Ajouter
          </button>
        </div>
      </div>

      <Separator className="mt-3" />

      {/* Filter bar */}
      <div
        className="px-5 py-3 -mx-1"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}
      >
        {/* Row 1: date + search + reset */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-3)",
              whiteSpace: "nowrap",
            }}
          >
            Filtres
          </span>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              if (!dateTo || e.target.value > dateTo) {
                setDateTo(e.target.value);
              }
            }}
            className="ds-input font-mono-data"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="ds-input font-mono-data"
          />

          <input
            type="text"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Nom ou matricule..."
            className="ds-input"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150"
            style={{ background: "transparent", color: "var(--text-3)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background  = "var(--accent-soft)";
              (e.currentTarget as HTMLElement).style.color       = "var(--accent)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,93,38,0.30)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background  = "transparent";
              (e.currentTarget as HTMLElement).style.color       = "var(--text-3)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            ↺ Réinitialiser
          </button>
        </div>

        {/* Row 2: status pills — table only */}
        {view === "table" && (
          <div
            className="flex flex-wrap items-center gap-2 mt-2 pt-2"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-3)",
                whiteSpace: "nowrap",
              }}
            >
              Statut
            </span>
            <button
              type="button"
              onClick={() => setSelectedStatus(null)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                !selectedStatus
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Tous
            </button>
            {RequestStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  selectedStatus === status
                    ? STATUS_ACTIVE[status]
                    : STATUS_COLORS[status]
                }`}
              >
                {status}
                {selectedStatus !== status && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {baseFiltered.filter((r) => r.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-4">
        {view === "kanban" ? (
          <RequestKanban data={baseFiltered} />
        ) : (
          <DataTable
            columns={columns}
            data={tableFiltered}
            showExport
          />
        )}
      </div>
    </>
  );
}