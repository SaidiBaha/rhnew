import { useState } from "react";
import { Save, Lock, Unlock } from "lucide-react";

import { Heading } from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import {
  columns,
  type SalaryAdvanceColumn,
} from "@/modules/salary-advance/components/columns";
import { useBatchUpdateSalaryAdvances } from "@/lib/data/salary-advance";
import { isEmpty } from "@/lib/utils";
import { Toggle } from "@/components/ui/Toggle";
import {
  useCreateSalaryAdvanceDeadline,
  useDeleteSalaryAdvanceDeadline,
  useFetchSalaryAdvanceDeadline,
} from "@/lib/data/salary-advance-deadline";
import useAuth from "@/hooks/useAuth";
import { DataTable } from "@/components/ui/DataTable";

interface SalaryAdvancesClientProps {
  data: SalaryAdvanceColumn[];
}

export function SalaryAdvancesClient({ data }: SalaryAdvancesClientProps) {
  const [salaryAdvanceData, setSalaryAdvanceData] =
    useState<SalaryAdvanceColumn[]>(data);
  const { auth } = useAuth();

  const batchUpdateSalaryAdvances = useBatchUpdateSalaryAdvances();
  const fetchSalaryAdvanceDeadline = useFetchSalaryAdvanceDeadline();
  const createSalaryAdvanceDeadline = useCreateSalaryAdvanceDeadline();
  const deleteSalaryAdvanceDeadline = useDeleteSalaryAdvanceDeadline();

  const deadline = fetchSalaryAdvanceDeadline.data?.deadline;

  const isLocked = deadline ? new Date(deadline) <= new Date() : false;
  const isAdmin = auth.user?.role === "ADMIN";

  const isLoading =
    fetchSalaryAdvanceDeadline.isLoading ||
    createSalaryAdvanceDeadline.isPending ||
    deleteSalaryAdvanceDeadline.isPending;
  const isDisabled =
    batchUpdateSalaryAdvances.isPending || (isLocked && !isAdmin);

  const updateData = (rowIndex: number, columnId: string, value: unknown) => {
    setSalaryAdvanceData((old) =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...old[rowIndex]!,
            [columnId]: value,
          };
        }
        return row;
      })
    );
  };

  const handleSave = () => {
    batchUpdateSalaryAdvances.mutate(
      salaryAdvanceData.map((salaryAdvance) => ({
        id: salaryAdvance.id,
        amount: salaryAdvance.amount,
        comment: isEmpty(salaryAdvance.comment)
          ? undefined
          : salaryAdvance.comment.trim(),
      }))
    );
  };

  const handleToggle = () => {
    if (isLocked) deleteSalaryAdvanceDeadline.mutate();
    else createSalaryAdvanceDeadline.mutate();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Avances (${data.length})`}
          description={"Gérer les avances."}
        />

        <div className="flex gap-x-2 items-center justify-center">
          {isAdmin && (
            <Toggle
              size="lg"
              variant="outline"
              disabled={isLoading}
              pressed={isLocked}
              onClick={handleToggle}
              className="data-[state=off]:text-green-700 data-[state=on]:text-red-500 hover:cursor-pointer"
            >
              {isLocked ? (
                <>
                  <Lock className="mr-2 size-4" />
                  Accès Verrouillé
                </>
              ) : (
                <>
                  <Unlock className="mr-2 size-4" />
                  Accès Déverrouillé
                </>
              )}
            </Toggle>
          )}

          <Button
            onClick={handleSave}
            disabled={isDisabled}
            className="bg-[#687818] text-white"
          >
            <Save className="mr-2 size-4" />
            Enregistrer
          </Button>
        </div>
      </div>
      <Separator />
      <DataTable
        columns={columns}
        data={salaryAdvanceData}
        globalFilterFn={"includesString"}
        meta={{ updateData }}
        showExport
      />
    </>
  );
}
