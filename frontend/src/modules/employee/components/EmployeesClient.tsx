import { useState } from "react";
import { Upload } from "lucide-react"; // Retirer Plus car non utilisé
// Retirer useNavigate car non utilisé
import z from "zod";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import axios, { AxiosError } from "axios";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { DataTable } from "@/components/ui/DataTable";
import {
  columns,
  type EmployeeColumn,
} from "@/modules/employee/components/columns";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import type { EmployeeRequest } from "@/modules/employee/types";
import { UploadEmployeeSchema } from "@/modules/employee/schema";
import { useBatchSaveEmployees } from "@/lib/data/employee";
import { parseEmployee } from "../utils";

interface EmployeesClientProps {
  data: EmployeeColumn[];
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
        parseEmployee(row, index)
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
          title={`Employés (${data.length})`}
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

      <DataTable
        columns={columns}
        data={data}
        globalFilterFn={"includesString"}
        showExport
      />
    </>
  );
}
