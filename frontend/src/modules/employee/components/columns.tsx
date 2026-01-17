import type { ColumnDef } from "@tanstack/react-table";

import type { Civility } from "@/modules/employee/types";
import type { AttendanceColumn } from "@/modules/attendance/components/columns";

export type EmployeeColumn = {
  id: string;
  matricule: string;
  civility: Civility;
  fullName: string;
  department: string;
  jobTitle: string;
  productionLine?: string;
  shift?: string;
  employmentType: string;
  hireDate: string;
  hasBankDomiciliation: string;
  supervisor: string;
  attendance: AttendanceColumn;
};

export const columns: ColumnDef<EmployeeColumn>[] = [
  {
    accessorKey: "matricule",
    header: "Matricule",
  },
  {
    accessorKey: "civility",
    header: "Civilité",
  },
  {
    accessorKey: "fullName",
    header: "Nom et prénom",
  },
  {
    accessorKey: "department",
    header: "Département",
  },
  {
    accessorKey: "jobTitle",
    header: "Poste Occupé",
  },
  {
    accessorKey: "productionLine",
    header: "Ligne de Production",
  },
  {
    accessorKey: "shift",
    header: "Poste",
  },
  {
    accessorKey: "employmentType",
    header: "Type de Travail",
  },
  {
    accessorKey: "hireDate",
    header: "Date d'Embauche",
  },
  {
    accessorKey: "supervisor",
    header: "Superviseur",
  },
  {
    accessorKey: "hasBankDomiciliation",
    header: "Domiciliation",
  },
];
