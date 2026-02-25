import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/Badge";
import type { EmployeeColumn } from "@/modules/employee/components/columns";
import { EditableCell } from "@/modules/salary-advance/components/EditableCell";

export type SalaryAdvanceColumn = {
  id: string;
  month: number;
  year: number;
  employee: EmployeeColumn;
  amount: number;
  comment: string;
  updatedAt: string;
  updatedBy: string;
};

export const columns: ColumnDef<SalaryAdvanceColumn>[] = [
  {
    accessorKey: "employee.matricule",
    header: "Matricule",
  },
  {
    id: "employee.fullName",
    accessorKey: "employee.fullName",
    header: "Nom et Prénom",
  },
  {
    accessorKey: "employee.jobTitle",
    header: "Poste Occupé",
  },
  {
    accessorKey: "employee.supervisor",
    header: "Superviseur",
  },
  {
    accessorKey: "employee.attendance.totalAttendance",
    header: "Heures travaillées",
  },
  {
    accessorKey: "employee.attendance.absenceReasons",
    header: "Motif",
    cell: ({ row }) => (
      <div className="flex items-center gap-x-2">
        {row.original.employee.attendance.absenceReasons.map(
          (absenceReason) => (
            <Badge
              variant="outline"
              className="shadow-xl border-neutral-100"
              key={absenceReason.absenceReason}
            >{`${absenceReason.absenceReason}: ${absenceReason.count}`}</Badge>
          )
        )}
      </div>
    ),
  },
  {
    accessorKey: "employee.hasBankDomiciliation",
    header: "Domiciliation",
  },
  {
    accessorKey: "amount",
    header: "Montant",
    cell: EditableCell,
    meta: {
      type: "number",
    },
  },
  {
    accessorKey: "comment",
    header: "commentaire",
    cell: EditableCell,
    meta: {
      type: "text",
    },
    
  },
  {
    accessorKey: "updatedAt",
    header: "Mis à jour le",
  },
  {
    accessorKey: "updatedBy",
    header: "Mis à jour par",
  },
];
