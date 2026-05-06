import { useState } from "react";
import { Upload } from "lucide-react";
import z from "zod";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import { Heading } from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import { UploadAttendanceSchema } from "@/modules/attendance/schema";
import { useBatchSaveAttendances } from "@/lib/data/attendance";
import type { AttendanceRequest } from "@/modules/attendance/types";

import {
  columns,
  type EmployeeAttendanceColumn,
} from "@/modules/attendance/components/columns";
import { DataTable } from "@/components/ui/DataTable";
import { parseAttendance } from "../utils";

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
      const workbook = XLSX.read(arrayBuffer, {
        type: "buffer",
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData: unknown[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
      });

      const attendances: AttendanceRequest[] = jsonData.map((row, index) =>
        parseAttendance(row, index)
      );

      await batchSaveAttendances.mutateAsync(attendances);
      setIsFileUploadOpen(false);
    } catch (error) {
      toast.error(`${error}`, { duration: 6000 });
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
        description="Importer le pointage des employés"
        onSubmit={onSubmit}
        isLoading={isLoading}
      />

      <div className="flex items-center justify-between">
        <Heading
          title={`Pointage (${data.length})`}
          description={"Gérer le pointage des employés."}
        />

        <div className="flex items-center justify-center gap-x-4">
          <Button
            onClick={() => setIsFileUploadOpen(true)}
            variant="outline"
            className="bg-[#687818] text-white"
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
