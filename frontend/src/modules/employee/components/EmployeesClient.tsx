import { useState } from "react";
import { Upload, Plus } from "lucide-react"; // Ajout de l'icône Plus
import { useNavigate } from "react-router-dom"; // Ajout de useNavigate
import z from "zod";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

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

export function EmployeesClient({ data }: EmployeesClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const batchSaveEmployees = useBatchSaveEmployees();
  const navigate = useNavigate(); // Hook pour la navigation

  async function onSubmit(data: z.infer<typeof UploadEmployeeSchema>) {
    setIsLoading(true);
    try {
      const file = data.files[0];
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
          {/* Bouton Ajouter un employé */}
          <Button
            onClick={() => navigate("/addEmployee")} // Navigation vers la page d'ajout
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 size-4" />
            Ajouter un employé
          </Button>
          
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