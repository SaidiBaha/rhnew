import type { ColumnDef } from "@tanstack/react-table";
import { FilterIcon } from "lucide-react";

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
  supervisor: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy?: string;
};

export const statusColor = (status: RequestStatus) => {
  switch (status) {
    case "SOUMIS":  return "bg-blue-500";
    case "TRAITÉ":  return "bg-green-600";
    case "REJETÉ":  return "bg-red-500";
    case "ANNULÉ":  return "bg-orange-500";
    case "CLÔTURÉ": return "bg-gray-500";
    default:        return "bg-gray-400";
  }
};

export const columns: ColumnDef<RequestColumn>[] = [
  { accessorKey: "employee.matricule", header: "Matricule" },
  { id: "employee.fullName", accessorKey: "employee.fullName", header: "Nom et Prénom" },
  { accessorKey: "employee.jobTitle", header: "Poste Occupé" },
  { accessorKey: "supervisor", header: "Superviseur" },
  {
    accessorKey: "requestType",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <span>Type de Demande</span>
        <MultiSelect
          options={RequestTypes.map((r) => ({ value: r, label: r }))}
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
  { id: "actions", cell: ({ row }) => <CellActions data={row.original} /> },
];