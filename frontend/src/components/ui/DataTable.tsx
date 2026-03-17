import React, { useCallback, useEffect, useRef } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFnOption,
  type Row,
  type Table as TanstackTable,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
} from "lucide-react";
import { Workbook } from "exceljs";
import { saveAs } from "file-saver";

import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";

export interface TableMeta {
  updateData: (rowIndex: number, columnId: string, value: unknown) => void;
}

export interface ColumnMeta {
  type?: "text" | "number";
  exportLabel?: string;
}

export interface ServerPaginationProps {
  page: number;           // 0-based current page
  totalPages: number;
  totalElements: number;
  isFetching: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPageChange: (page: number) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderSubComponent?: (
    row: Row<TData>,
    table?: TanstackTable<TData>
  ) => React.ReactElement;
  title?: string;
  searchKey?: string;
  globalFilterFn?: FilterFnOption<TData>;
  meta?: TableMeta;
  showExport?: boolean;
  initialPageSize?: number;
  hidePagination?: boolean;
  serverPagination?: ServerPaginationProps;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowCanExpand,
  renderSubComponent,
  title,
  searchKey,
  globalFilterFn,
  meta,
  showExport = false,
  initialPageSize,
  hidePagination = false,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const [expanded, setExpanded] = React.useState({});

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  function useSkipper() {
    const shouldSkipRef = useRef(true);
    const shouldSkip = shouldSkipRef.current;

    const skip = useCallback(() => {
      shouldSkipRef.current = false;
    }, []);

    useEffect(() => {
      shouldSkipRef.current = true;
    });

    return [shouldSkip, skip] as const;
  }

  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand,
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    autoResetPageIndex,
    globalFilterFn: globalFilterFn,
    state: {
      columnFilters,
      expanded,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize ?? 25,
      },
    },
    meta: meta && {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        skipAutoResetPageIndex();
        meta.updateData(rowIndex, columnId, value);
      },
    },
  });

  const exportToExcel = async () => {
    const wb = new Workbook();
    const ws = wb.addWorksheet("Sheet 1");

    const lastHeaderGroup = table.getHeaderGroups().at(-1);

    if (!lastHeaderGroup) {
      console.error("No header groups found", table.getHeaderGroups());
      return;
    }

    const exportCols = lastHeaderGroup.headers.filter(
      (h) => h.column.getIsVisible() && h.column.id !== "actions"
    );

    ws.columns = exportCols.map((h) => {
      const header =
        (h.column.columnDef.meta as ColumnMeta)?.exportLabel ??
        h.column.columnDef.header;
      return {
        header: header as string,
        key: h.id,
        width: 20,
      };
    });

    const exportRows = table.getFilteredRowModel().rows;

    exportRows.forEach((row) => {
      const values = exportCols.map((h) => {
        return row.getValue(h.id) ?? "";
      });

      ws.addRow(values);
    });

    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "export.xlsx");
  };

  /* ── Pagination info ── */
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const clientFrom = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const clientTo = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  // Server pagination values (used when serverPagination prop is provided)
  const sp = serverPagination;
  const activePage     = sp ? sp.page : pageIndex;
  const activeTotalPages = sp ? sp.totalPages : table.getPageCount();
  const activeFrom     = sp ? sp.page * (initialPageSize ?? 25) + 1 : clientFrom;
  const activeTo       = sp ? Math.min((sp.page + 1) * (initialPageSize ?? 25), sp.totalElements) : clientTo;
  const activeTotal    = sp ? sp.totalElements : totalFiltered;
  const activeIsFetching = sp?.isFetching ?? false;

  const goToPage = (i: number) => {
    if (sp) sp.onPageChange(i);
    else table.setPageIndex(i);
  };
  const canPrev = sp ? !sp.isFirst : table.getCanPreviousPage();
  const canNext = sp ? !sp.isLast  : table.getCanNextPage();

  return (
    <div className="space-y-3">
      {title && (
        <h2 className="text-2xl font-bold tracking-tight py-2">{title}</h2>
      )}

      {/* ── Toolbar: search + export ── */}
      {(searchKey || globalFilterFn || showExport) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {(searchKey || globalFilterFn) && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Rechercher..."
                value={
                  globalFilterFn
                    ? (table.getState().globalFilter as string) ?? ""
                    : searchKey
                    ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
                    : ""
                }
                onChange={(event) =>
                  globalFilterFn
                    ? table.setGlobalFilter(event.target.value)
                    : searchKey
                    ? table.getColumn(searchKey)?.setFilterValue(event.target.value)
                    : ""
                }
                className="pl-9 h-9"
              />
            </div>
          )}

          {showExport && (
            <button
              type="button"
              onClick={exportToExcel}
              className="ds-btn-primary h-9 shrink-0"
            >
              <Download className="size-4" />
              Exporter Excel
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="ds-card overflow-hidden" style={{ padding: 0 }}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                style={{ background: "#f4f6f9", borderBottom: "1px solid var(--border)" }}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      background: "#f4f6f9",
                      color: "var(--text-3)",
                      fontSize: "10px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      height: "44px",
                      padding: "0 16px",
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    style={{
                      background: rowIndex % 2 === 1 ? "#f8f9fc" : "var(--surface)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--steel-light)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = rowIndex % 2 === 1 ? "#f8f9fc" : "var(--surface)"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                    {row.getCanExpand() && (
                      <TableCell className="px-4 py-3">
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={row.getToggleExpandedHandler()}
                        >
                          {row.getIsExpanded() ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {row.getIsExpanded() && renderSubComponent && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} className="p-0">
                        {renderSubComponent(row, table)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center" style={{ color: "var(--text-3)" }}
                >
                  Aucun résultat trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {!hidePagination && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
          {/* Info texte */}
          <p className="text-sm" style={{ color: "var(--text-3)" }}>
            {activeTotal === 0
              ? "Aucun résultat"
              : `Affichage de ${activeFrom} à ${activeTo} sur ${activeTotal} résultat${activeTotal !== 1 ? "s" : ""}`}
          </p>

          {/* Contrôles de pagination */}
          <div className="flex items-center gap-1">
            {/* Bouton première page */}
            <button
              type="button"
              onClick={() => goToPage(0)}
              disabled={!canPrev || activeIsFetching}
              title="Première page"
              className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              <ChevronsLeft className="size-4" />
            </button>

            {/* Bouton page précédente */}
            <button
              type="button"
              onClick={() => goToPage(activePage - 1)}
              disabled={!canPrev || activeIsFetching}
              title="Page précédente"
              className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* Pages numérotées (fenêtre glissante de ±2) */}
            {Array.from({ length: activeTotalPages }, (_, i) => i)
              .filter((i) => Math.abs(i - activePage) <= 2)
              .map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToPage(i)}
                  disabled={activeIsFetching}
                  className="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium transition-colors"
                  style={{
                    background: i === activePage ? "var(--accent)" : "var(--surface2)",
                    border: `1px solid ${i === activePage ? "var(--accent)" : "var(--border)"}`,
                    color: i === activePage ? "#fff" : "var(--text-2)",
                  }}
                >
                  {i + 1}
                </button>
              ))}

            {/* Bouton page suivante */}
            <button
              type="button"
              onClick={() => goToPage(activePage + 1)}
              disabled={!canNext || activeIsFetching}
              title="Page suivante"
              className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              <ChevronRight className="size-4" />
            </button>

            {/* Bouton dernière page */}
            <button
              type="button"
              onClick={() => goToPage(activeTotalPages - 1)}
              disabled={!canNext || activeIsFetching}
              title="Dernière page"
              className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}