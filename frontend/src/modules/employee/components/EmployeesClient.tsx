import { useState } from "react";
import { Upload, ChevronLeft, ChevronRight, Search } from "lucide-react";
import z from "zod";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import axios, { AxiosError } from "axios";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { DataTable } from "@/components/ui/DataTable";
import { columns, type EmployeeColumn } from "@/modules/employee/components/columns";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import type { EmployeeRequest } from "@/modules/employee/types";
import { UploadEmployeeSchema } from "@/modules/employee/schema";
import { useBatchSaveEmployees } from "@/lib/data/employee";
import { parseEmployee } from "../utils";

interface EmployeesClientProps {
  data: EmployeeColumn[];
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearching: boolean;
}

/**
 * ✅ Type correspondant à ton ErrorDto backend
 * (celui renvoyé par RestExceptionHandler)
 */
type BackendErrorDto = {
  code?: string | number;
  httpCode?: number;
  message?: string;
  errors?: string[];
};

/**
 * ✅ Helper: extraire proprement l'erreur backend depuis Axios
 */
function extractAxiosError(err: unknown): {
  status?: number;
  code?: string | number;
  message: string;
  errors: string[];
  raw: unknown;
} {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<BackendErrorDto>;
    const status = axErr.response?.status;
    const data = axErr.response?.data;

    return {
      status,
      code: data?.code,
      message: data?.message ?? axErr.message ?? "Erreur API",
      errors: Array.isArray(data?.errors) ? data!.errors! : [],
      raw: err,
    };
  }

  if (err instanceof Error) {
    return { status: undefined, code: undefined, message: err.message, errors: [], raw: err };
  }

  return {
    status: undefined,
    code: undefined,
    message: "Une erreur inattendue est survenue",
    errors: [],
    raw: err,
  };
}

export function EmployeesClient({ data }: EmployeesClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const batchSaveEmployees = useBatchSaveEmployees();

  async function onSubmit(formData: z.infer<typeof UploadEmployeeSchema>) {
    setIsLoading(true);

    try {
      const file = formData.files[0];
      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "buffer",
        cellDates: true,
        dateNF: "dd/mm/yyyy",
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const employees: EmployeeRequest[] = jsonData.map((row, index) =>
  parseEmployee(row, index) as unknown as EmployeeRequest
);
      
      await batchSaveEmployees.mutateAsync(employees);

      toast.success("Import effectué avec succès ✅", { duration: 4000 });
      setIsFileUploadOpen(false);
    } catch (error) {
      const e = extractAxiosError(error);

      // ✅ Console (détaillée)
      console.group("❌ Employees batch import failed");
      console.error("HTTP:", e.status);
      console.error("Code:", e.code);
      console.error("Message:", e.message);
      if (e.errors?.length) console.error("Errors:", e.errors);
      console.error("Raw:", e.raw);
      console.groupEnd();

      // ✅ UI (toast)
      if (e.errors.length) {
        toast.error(
          <div>
            <div className="font-semibold">
              {e.message} {e.code ? `(code: ${e.code})` : ""}
            </div>
            <ul className="mt-2 list-disc pl-5">
              {e.errors.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error(`${e.message}${e.status ? ` (HTTP ${e.status})` : ""}`, {
          duration: 7000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <FileUploadModal
        isOpen={isFileUploadOpen}
        onClose={() => setIsFileUploadOpen(false)}
        title="Importer"
        description="Importer l'effectif des employés"
        onSubmit={onSubmit}
        isLoading={isLoading}
      />

      <div className="flex items-center justify-between">
        <Heading
          title={`Employés (${totalElements})`}
          description={"Gérer les employés."}
        />
        <div className="flex items-center justify-center gap-x-4">
          <Button
            onClick={() => setIsFileUploadOpen(true)}
            variant="outline"
            className="bg-[#687818] text-white hover:bg-[#687818]/90"
          >
            <Upload className="mr-2 size-4" />
            Importer
          </Button>
        </div>
      </div>

      <Separator />

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un employé..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#687818]"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-[#687818] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <DataTable
        columns={columns}
        data={data}
        showExport
        showPagination={false}
      />

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page === 0 ? totalPages - 1 : page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <strong className="text-sm font-medium">
          {page + 1} of {totalPages}
        </strong>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page === totalPages - 1 ? 0 : page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </>
  );
}
