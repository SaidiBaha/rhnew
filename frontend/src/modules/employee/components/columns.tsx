import type { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
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
    email?: string;
    attendance: AttendanceColumn;

    hasLeftCompanyLabel: string;
    departureDate: string;
};

const baseColumns: ColumnDef<EmployeeColumn>[] = [
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
        accessorKey: "hasLeftCompanyLabel",
        header: "Statut Employé",
    },
    {
        accessorKey: "departureDate",
        header: "Date de Départ",
    },
    {
        accessorKey: "supervisor",
        header: "Superviseur",
    },
    {
        accessorKey: "hasBankDomiciliation",
        header: "Domiciliation",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
];

export const columns = baseColumns;

export function getColumnsWithActions(
    onEdit: (row: EmployeeColumn) => void
): ColumnDef<EmployeeColumn>[] {
    return [
        ...baseColumns,
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => onEdit(row.original)}
                    title="Modifier"
                    className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-[var(--accent-light)]"
                    style={{
                        border: "1px solid var(--border)",
                        color: "var(--accent)",
                    }}
                >
                    <Pencil className="size-3.5" />
                </button>
            ),
        },
    ];
}
