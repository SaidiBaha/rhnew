import type { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { computeStatus, STATUS_LABEL, STATUS_STYLE } from "../utils/status";
import type { DailyAttendance } from "../types";

export type PresenceRow = DailyAttendance;

export function buildColumns(
  onEdit: (row: PresenceRow) => void,
  canEdit = true,
  isNurse = false,
  onToggleAppele?: (id: number, appele: boolean) => void
): ColumnDef<PresenceRow>[] {
  return [
    {
      accessorKey: "matricule",
      header: "Matricule",
      cell: ({ getValue }) => (
        <span className="font-mono-data text-sm">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: "fullName",
      header: "Nom complet",
    },
    {
      accessorKey: "department",
      header: "Département",
      cell: ({ getValue }) => getValue() ?? "—",
    },
    {
      accessorKey: "horaire",
      header: "Horaire",
      cell: ({ getValue }) => getValue() ?? "—",
    },
    {
      accessorKey: "debut",
      header: "Début",
      cell: ({ getValue }) => getValue() ?? "—",
    },
    {
      accessorKey: "fin",
      header: "Fin",
      cell: ({ getValue }) => getValue() ?? "—",
    },
    {
      accessorKey: "clockIn",
      header: "Entrée",
      cell: ({ getValue }) => getValue() ?? "—",
    },
    {
      accessorKey: "clockOut",
      header: "Sortie",
      cell: ({ getValue }) => getValue() ?? "—",
    },
    {
      accessorKey: "absenceReason",
      header: "Motif",
      cell: ({ getValue }) => getValue() ?? "—",
    },
    {
      id: "status",
      header: "Statut",
      cell: ({ row }) => {
        const status = computeStatus(row.original);
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={STATUS_STYLE[status]}
          >
            {STATUS_LABEL[status]}
          </span>
        );
      },
    },
    // Colonne "Actions" — Edit (non-NURSE uniquement)
    ...(canEdit
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }: { row: { original: PresenceRow } }) => (
              <button
                onClick={() => onEdit(row.original)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                  border: "1px solid rgba(47,107,255,0.2)",
                }}
                title="Éditer le pointage"
              >
                <Pencil className="h-3.5 w-3.5" />
                Éditer
              </button>
            ),
          } as ColumnDef<PresenceRow>,
        ]
      : []),
    // Colonne "Appelé" — NURSE uniquement
    ...(isNurse
      ? [
          {
            id: "appele",
            header: "Appelé",
            cell: ({ row }: { row: { original: PresenceRow } }) => {
              const { id, appele, appeleAt } = row.original;
              const isAppele = !!appele;

              return (
                <button
                  onClick={() => onToggleAppele?.(id, !isAppele)}
                  title={isAppele ? "Annuler l'appel" : "Marquer comme appelé"}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 0",
                    minWidth: 110,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: isAppele ? "#1D9E75" : "#888780",
                    }}
                  >
                    <span style={{ fontSize: 15, lineHeight: 1 }}>
                      {isAppele ? "●" : "○"}
                    </span>
                    {isAppele ? "Appelé" : "Non appelé"}
                  </span>
                  {isAppele && appeleAt && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#1D9E75",
                        paddingLeft: 21,
                        opacity: 0.75,
                      }}
                    >
                      à {appeleAt}
                    </span>
                  )}
                </button>
              );
            },
          } as ColumnDef<PresenceRow>,
        ]
      : []),
  ];
}
