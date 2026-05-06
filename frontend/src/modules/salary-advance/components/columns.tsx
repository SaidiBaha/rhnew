import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/Badge";
import useAuth from "@/hooks/useAuth";
import type { EmployeeColumn } from "@/modules/employee/components/columns";
import { EditableCell } from "@/modules/salary-advance/components/EditableCell";

export type SalaryAdvanceColumn = {
  id: string;
  month: number;
  year: number;
  employee: EmployeeColumn;
  amount: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

function AbsenceReasonsCell({ row }: { row: SalaryAdvanceColumn }) {
  const { auth } = useAuth();
  const isCurrentSupervisor = auth.user?.matricule === row.employee.matricule;

  return (
    <div className="flex items-center gap-x-2">
      {row.employee.attendance.absenceReasons.map((absenceReason) => (
        <Badge
          variant="outline"
          className="shadow-xl border-neutral-100"
          key={absenceReason.absenceReason}
          style={isCurrentSupervisor ? { color: "#111111", borderColor: "rgba(17,17,17,0.35)" } : undefined}
        >{`${absenceReason.absenceReason}: ${absenceReason.count}`}</Badge>
      ))}
    </div>
  );
}

export const columns: ColumnDef<SalaryAdvanceColumn>[] = [
  {
    accessorKey: "employee.matricule",
    header: "Matricule",
  },
  {
    id: "employee.fullName",
    accessorKey: "employee.fullName",
    header: "Nom et Prenom",
  },
  {
    accessorKey: "employee.jobTitle",
    header: "Poste Occupe",
  },
  {
    accessorKey: "employee.supervisor",
    header: "Superviseur",
  },
  {
    accessorKey: "employee.attendance.totalAttendance",
    header: "Heures travaillees",
  },
  {
    accessorKey: "employee.attendance.absenceReasons",
    header: "Motif",
    cell: ({ row }) => <AbsenceReasonsCell row={row.original} />,
  },
  {
    accessorKey: "employee.hasBankDomiciliation",
    header: "Domiciliation",
  },
  {
    accessorKey: "amount",
    header: "Montant a payer",
    cell: EditableCell,
    meta: {
      type: "number",
    },
  },
  {
    accessorKey: "comment",
    header: "Commentaire",
    cell: EditableCell,
    meta: {
      type: "text",
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Mis a jour le",
  },
  {
    accessorKey: "updatedBy",
    header: "Mis a jour par",
  },
];
