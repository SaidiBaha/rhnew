import { useMemo, useState } from "react";
import { Save, Lock, Unlock } from "lucide-react";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import {
  columns,
  type SalaryAdvanceColumn,
} from "@/modules/salary-advance/components/columns";
import { useBatchUpdateSalaryAdvances } from "@/lib/data/salary-advance";
import { isEmpty, parseDuration } from "@/lib/utils";
import { Toggle } from "@/components/ui/Toggle";
import {
  useCreateSalaryAdvanceDeadline,
  useDeleteSalaryAdvanceDeadline,
  useFetchSalaryAdvanceDeadline,
} from "@/lib/data/salary-advance-deadline";
import useAuth from "@/hooks/useAuth";
import { DataTable } from "@/components/ui/DataTable";
import type { Row } from "@tanstack/react-table";

const DEFAULT_ELIGIBLE_AMOUNT = 0;

function applyDefaultAmount(
  data: SalaryAdvanceColumn[],
  isAdmin: boolean
): SalaryAdvanceColumn[] {
  return data.map((row) => {
    if (row.amount !== 0) return row;
    if (isAdmin) return row;
    const emp = row.employee;
    if (emp.hasBankDomiciliation === "oui") return row;
    const absenceReasons = emp.attendance.absenceReasons;
    if (
      absenceReasons.some((ar) =>
        ["MALADIE L-D", "MATERNITÃ‰"].includes(ar.absenceReason)
      )
    ) {
      return row;
    }
    const { hours } = parseDuration(emp.attendance.totalAttendance) ?? {
      hours: 0,
      minutes: 0,
    };
    if (hours < 40) return row;
    return { ...row, amount: DEFAULT_ELIGIBLE_AMOUNT };
  });
}

interface SalaryAdvancesClientProps {
  data: SalaryAdvanceColumn[];
}

export function SalaryAdvancesClient({ data }: SalaryAdvancesClientProps) {
  const { auth } = useAuth();
  const isAdmin = auth.user?.role === "ADMIN";
  const isSupervisor = auth.user?.role === "SUPERVISOR";

  const [salaryAdvanceData, setSalaryAdvanceData] = useState<SalaryAdvanceColumn[]>(
    () => applyDefaultAmount(data, isAdmin)
  );

  const batchUpdateSalaryAdvances = useBatchUpdateSalaryAdvances();
  const fetchSalaryAdvanceDeadline = useFetchSalaryAdvanceDeadline();
  const createSalaryAdvanceDeadline = useCreateSalaryAdvanceDeadline();
  const deleteSalaryAdvanceDeadline = useDeleteSalaryAdvanceDeadline();

  const deadline = fetchSalaryAdvanceDeadline.data?.deadline;
  const isLocked = deadline ? new Date(deadline) <= new Date() : false;

  const isLoading =
    fetchSalaryAdvanceDeadline.isLoading ||
    createSalaryAdvanceDeadline.isPending ||
    deleteSalaryAdvanceDeadline.isPending;
  const isDisabled =
    batchUpdateSalaryAdvances.isPending || (isLocked && !isAdmin);

  const supervisorAdvance = useMemo(() => {
    if (!isSupervisor || !auth.user?.matricule) return null;

    return (
      salaryAdvanceData.find(
        (row) => row.employee.matricule === auth.user?.matricule
      ) ?? null
    );
  }, [auth.user?.matricule, isSupervisor, salaryAdvanceData]);

  const displayedAdvances = useMemo(() => salaryAdvanceData, [salaryAdvanceData]);

  const updateData = (rowIndex: number, columnId: string, value: unknown) => {
    const targetRow = displayedAdvances[rowIndex];

    if (!targetRow) return;

    setSalaryAdvanceData((old) =>
      old.map((row) => {
        if (row.id === targetRow.id) {
          return {
            ...row,
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

  const getRowStyle = (row: Row<SalaryAdvanceColumn>) => {
    const isCurrentSupervisor = row.original.employee.matricule === auth.user?.matricule;

    if (!isCurrentSupervisor) return undefined;

    return {
      background: "#f8f9fc",
      boxShadow: "inset 3px 0 0 #f59e0b",
      color: "#111111",
    };
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Avances (${data.length})`} description={"Gerer les avances."} />

        <div className="flex items-center justify-center gap-x-2">
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
                  AccÃ¨s VerrouillÃ©
                </>
              ) : (
                <>
                  <Unlock className="mr-2 size-4" />
                  AccÃ¨s DÃ©verrouillÃ©
                </>
              )}
            </Toggle>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isDisabled}
            className="ds-btn-primary"
          >
            <Save className="size-4" />
            Enregistrer
          </button>
        </div>
      </div>

      <Separator />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={displayedAdvances}
          globalFilterFn={"includesString"}
          meta={{ updateData }}
          showExport
          getRowStyle={getRowStyle}
        />
      </div>
    </>
  );
}
