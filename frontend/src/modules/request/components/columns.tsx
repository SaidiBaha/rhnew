import type { ColumnDef } from "@tanstack/react-table";
import { FilterIcon, CheckCircle, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { CellActions } from "@/modules/request/components/CellActions";
import {
  RequestStatuses,
  RequestTypes,
  type RequestStatus,
  type RequestType,
} from "@/modules/request/types";
import type { EmployeeColumn } from "@/modules/employee/components/columns";

export type RequestColumn = {
  id: string;
  requestType: RequestType;
  comment: string;
  status: RequestStatus;
  employee: EmployeeColumn;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy?: string;
};

const statusColor = (status: RequestStatus) => {
  return status === "ANNULÉ"
    ? "bg-red-500"
    : status === "EN_PROGRESSION"
    ? "bg-yellow-500"
    : "bg-green-700";
};

export interface GetColumnsOptions {
  isAdminOrSuperAdmin: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onToggleAll: () => void;
  onQuickStatus: (id: string, status: RequestStatus) => void;
}

export function getColumns({
  isAdminOrSuperAdmin,
  selectedIds,
  onToggle,
  isAllSelected,
  isIndeterminate,
  onToggleAll,
  onQuickStatus,
}: GetColumnsOptions): ColumnDef<RequestColumn>[] {
  const cols: ColumnDef<RequestColumn>[] = [];

  if (isAdminOrSuperAdmin) {
    cols.push({
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isIndeterminate;
          }}
          onChange={onToggleAll}
          className="h-4 w-4 cursor-pointer rounded"
          style={{ accentColor: "var(--accent)" }}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => onToggle(row.original.id)}
          className="h-4 w-4 cursor-pointer rounded"
          style={{ accentColor: "var(--accent)" }}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { exportLabel: "" },
    });
  }

  cols.push(
    { accessorKey: "employee.matricule", header: "Matricule" },
    {
      id: "employee.fullName",
      accessorKey: "employee.fullName",
      header: "Nom et Prénom",
    },
    { accessorKey: "employee.jobTitle", header: "Poste Occupé" },
    { accessorKey: "employee.supervisor", header: "Superviseur" },
    {
      accessorKey: "requestType",
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Type de Demande</span>
          <MultiSelect
            options={RequestTypes.map((t) => ({ value: t, label: t }))}
            onValueChange={(value) => column.setFilterValue(value)}
            popoverTrigger={
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <FilterIcon className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      ),
      meta: { exportLabel: "Type de Demande" },
      enableColumnFilter: true,
      filterFn: "arrIncludesSome",
    },
    { accessorKey: "comment", header: "Motif" },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Status</span>
          <MultiSelect
            options={RequestStatuses.map((s) => ({ value: s, label: s }))}
            onValueChange={(value) => column.setFilterValue(value)}
            popoverTrigger={
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <FilterIcon className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      ),
      cell: ({ row }) => (
        <Badge className={statusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
      meta: { exportLabel: "Status" },
      enableColumnFilter: true,
      filterFn: "arrIncludesSome",
    },
    { accessorKey: "createdAt", header: "Créé à" },
    { accessorKey: "createdBy", header: "Créé par" },
    { accessorKey: "updatedAt", header: "Mis à jour le" },
    { accessorKey: "updatedBy", header: "Mis à jour par" },
    {
      id: "actions",
      cell: ({ row }) => {
        const isTerminal =
          row.original.status === "TRAITÉ" || row.original.status === "ANNULÉ";
        return (
          <div className="flex items-center gap-1">
            {isAdminOrSuperAdmin && (
              <>
                <button
                  title={isTerminal ? "Statut déjà finalisé" : "Marquer comme traité"}
                  disabled={isTerminal}
                  onClick={() => onQuickStatus(row.original.id, "TRAITÉ")}
                  className="rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-[rgba(0,196,140,0.1)]"
                  style={{ color: "var(--accent2)" }}
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button
                  title={isTerminal ? "Statut déjà finalisé" : "Marquer comme annulé"}
                  disabled={isTerminal}
                  onClick={() => onQuickStatus(row.original.id, "ANNULÉ")}
                  className="rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-[rgba(240,62,62,0.1)]"
                  style={{ color: "var(--accent4)" }}
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </>
            )}
            <CellActions data={row.original} />
          </div>
        );
      },
    }
  );

  return cols;
}
