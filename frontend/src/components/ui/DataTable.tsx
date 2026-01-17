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
  Download,
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

    // Wrap a function with this to skip a pagination reset temporarily
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

  return (
    <div>
      {title && (
        <h2 className="text-2xl font-bold tracking-tight py-4">{title}</h2>
      )}

      {(searchKey || globalFilterFn) && (
        <div className="flex items-center py-4">
          <Input
            placeholder="Rechercher"
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
            className="max-w-sm border-[#687818]"
          />
        </div>
      )}

      {showExport && (
        <div className="flex items-center justify-end pb-4">
          <Button onClick={exportToExcel} className="bg-[#687818]">
            <Download className="mr-2 size-4" />
            Exporter
          </Button>
        </div>
      )}

      <div className="w-full rounded-md border">
        <Table>
          <TableHeader className="bg-[#687818] grow">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-[#687818] text-white grow"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-[#687818] text-white grow"
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
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                    {row.getCanExpand() && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={row.getToggleExpandedHandler()}
                        >
                          {row.getCanExpand() &&
                            (row.getIsExpanded() ? (
                              <ChevronUp />
                            ) : (
                              <ChevronDown />
                            ))}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {row.getIsExpanded() && renderSubComponent && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1}>
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
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <strong className="text-sm font-medium">
          {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </strong>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
