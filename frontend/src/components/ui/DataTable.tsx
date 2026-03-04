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
        pageSize: 25,
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
  const from = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalFiltered);

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
                className="pl-9 h-9 border-slate-200 focus-visible:border-[#687818] focus-visible:ring-[#687818]/20"
              />
            </div>
          )}

          {showExport && (
            <Button
              onClick={exportToExcel}
              size="sm"
              className="bg-[#687818] hover:bg-[#5a6610] h-9 shrink-0"
            >
              <Download className="size-4" />
              Exporter Excel
            </Button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-[#687818] text-white hover:bg-[#687818]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-[#687818] text-white font-semibold text-xs uppercase tracking-wider h-11 px-4"
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
                    className={rowIndex % 2 === 1 ? "bg-slate-50/60" : "bg-white"}
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
                  className="h-32 text-center text-slate-400"
                >
                  Aucun résultat trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <p className="text-sm text-slate-500">
          {totalFiltered === 0
            ? "Aucun résultat"
            : `Affichage de ${from} à ${to} sur ${totalFiltered} résultat${totalFiltered !== 1 ? "s" : ""}`}
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            title="Première page"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            title="Page précédente"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="px-3 text-sm font-medium text-slate-700 select-none">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            title="Page suivante"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            title="Dernière page"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
