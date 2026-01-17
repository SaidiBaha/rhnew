import type { ColumnDef } from "@tanstack/react-table";

import type { EmployeeColumn } from "@/modules/employee/components/columns";
import { Badge } from "@/components/ui/Badge";

export type AttendanceColumn = {
  totalDays: number;
  totalAttendance: string;
  totalOvertime: string;
  absenceReasons: { absenceReason: string; count: number }[];
};

export type EmployeeAttendanceColumn = {
  employee: EmployeeColumn;
  attendance: AttendanceColumn;
};

export const columns: ColumnDef<EmployeeAttendanceColumn>[] = [
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
    accessorKey: "attendance.totalDays",
    header: "Jours travaillés",
  },
  {
    accessorKey: "attendance.totalAttendance",
    header: "Heures travaillées",
  },
  {
    accessorKey: "attendance.totalOvertime",
    header: "Heures Supp. travaillées",
  },
  {
    accessorKey: "attendance.absenceReasons",
    header: "Motif",
    cell: ({ row }) => (
      <div className="flex items-center gap-x-2">
        {row.original.attendance.absenceReasons.map((absenceReason) => (
          <Badge
            className="shadow-xl border-muted"
            variant="outline"
            key={absenceReason.absenceReason}
          >{`${absenceReason.absenceReason}: ${absenceReason.count}`}</Badge>
        ))}
      </div>
    ),
  },
];
