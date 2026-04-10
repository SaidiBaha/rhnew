import { useState } from "react";
import { Upload } from "lucide-react";
import z from "zod";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import { UploadAttendanceSchema } from "@/modules/attendance/schema";
import { useBatchSaveAttendances } from "@/lib/data/attendance";

import {
  columns,
  type EmployeeAttendanceColumn,
} from "@/modules/attendance/components/columns";
import { DataTable } from "@/components/ui/DataTable";
import { validateAttendanceDates, parseNewAttendanceFormat } from "../utils";
import { logError, showErrorToast } from "@/modules/employee/api-error";

interface AttendancesClientProps {
  data: EmployeeAttendanceColumn[];
}

export function AttendancesClient({ data }: AttendancesClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const batchSaveAttendances = useBatchSaveAttendances();

  async function onSubmit(data: z.infer<typeof UploadAttendanceSchema>) {
    setIsLoading(true);
    try {
      const file = data.files[0];
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "buffer" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // dateNF force le format YYYY-MM-DD sur les cellules date
      const jsonData: unknown[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: "yyyy-mm-dd",
      });

      // 1) Validation des dates : les 4 premières et 4 dernières uniques = aujourd'hui
      validateAttendanceDates(jsonData);

      // 2) Parse + regroupement (2 shifts par employé → 1 enregistrement)
      const attendances = parseNewAttendanceFormat(jsonData);

      // 3) Envoi au backend
      await batchSaveAttendances.mutateAsync(attendances);
      setIsFileUploadOpen(false);
      toast.success("Import réussi !", { duration: 4000, icon: "✅" });
    } catch (error) {
      logError("Import des pointages", error);
      showErrorToast(error, "Erreur lors de l'import");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <FileUploadModal
        isOpen={isFileUploadOpen}
        onClose={() => setIsFileUploadOpen(false)}
        title="Importer les pointages"
        description="Importer le pointage des employés depuis un fichier Excel"
        onSubmit={onSubmit}
        isLoading={isLoading}
      />

      <div className="flex items-center justify-between">
        <Heading
          title={`Pointage (${data.length})`}
          description={"Gérer le pointage des employés."}
        />

        <div className="flex items-center justify-center gap-x-4">
          <button
            type="button"
            onClick={() => setIsFileUploadOpen(true)}
            className="ds-btn-primary"
          >
            <Upload className="size-4" />
            Importer
          </button>
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
