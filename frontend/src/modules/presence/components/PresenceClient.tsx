import { useState } from "react";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import { DataTable } from "@/components/ui/DataTable";
import { UploadAttendanceSchema } from "@/modules/attendance/schema";
import {
  validateAttendanceDates,
  parseNewAttendanceFormat,
} from "@/modules/attendance/utils";
import { logError, showErrorToast } from "@/modules/employee/api-error";

import { useImportPresence } from "../hooks/useImportPresence";
import { buildColumns } from "./columns";
import { EditAttendanceModal } from "./EditAttendanceModal";
import type { DailyAttendance } from "../types";
import type { PresenceRow } from "./columns";
import useAuth from "@/hooks/useAuth";

interface Props {
  data: DailyAttendance[];
}

export function PresenceClient({ data }: Props) {
  const { auth } = useAuth();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editRecord, setEditRecord] = useState<PresenceRow | null>(null);

  const importPresence = useImportPresence();

  const canImport = auth.user?.role
    ? (["ADMIN", "SUPER_ADMIN", "SUPERVISOR"] as string[]).includes(auth.user.role)
    : false;

  const canEdit = auth.user?.role
    ? (["ADMIN", "SUPER_ADMIN", "SUPERVISOR"] as string[]).includes(auth.user.role)
    : false;

  const columns = buildColumns((row) => setEditRecord(row), canEdit);

  async function handleImport(formData: { files: File[] }) {
    setIsImporting(true);
    try {
      const file = formData.files[0];

      // Validation type
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        throw new Error("Format invalide. Seuls les fichiers .xlsx et .xls sont acceptés.");
      }

      // Validation taille (10 Mo)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Limite : 10 Mo.`);
      }
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "buffer" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData: unknown[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: "yyyy-mm-dd",
      });

      // Validation des dates (règle : 4 premières + 4 dernières uniques = aujourd'hui)
      validateAttendanceDates(jsonData);

      // Parse + regroupement (2 shifts → 1 enregistrement)
      const records = parseNewAttendanceFormat(jsonData);

      await importPresence.mutateAsync(records);
      setIsImportOpen(false);
    } catch (error) {
      logError("Import présences", error);
      showErrorToast(error, "Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <FileUploadModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Importer le fichier de pointage"
        description="Fichier XLSX du jour courant — colonnes : Matricule, Prénom, Date, Horaire, Début, Fin, Entrée, Sortie, Motif, Département"
        onSubmit={handleImport}
        isLoading={isImporting}
      />

      <EditAttendanceModal
        record={editRecord}
        onClose={() => setEditRecord(null)}
      />

      <div className="flex items-center justify-between">
        <Heading
          title={`Présences / Absences (${data.length})`}
          description="Présences du jour courant — import, édition et suivi en temps réel."
        />

        {canImport && (
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="ds-btn-primary"
          >
            <Upload className="size-4" />
            Importer le fichier de pointage
          </button>
        )}
      </div>

      <Separator />

      <DataTable
        columns={columns}
        data={data}
        globalFilterFn="includesString"
        initialPageSize={50}
      />
    </>
  );
}
