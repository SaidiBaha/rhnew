import { useEffect, useState } from "react";
import type { CellContext } from "@tanstack/react-table";

import { Input } from "@/components/ui/Input";
import type { ColumnMeta, TableMeta } from "@/components/ui/DataTable";
import type { SalaryAdvanceColumn } from "@/modules/salary-advance/components/columns";
import useAuth from "@/hooks/useAuth";
import { useFetchSalaryAdvanceDeadline } from "@/lib/data/salary-advance-deadline";
import { cn, parseDuration } from "@/lib/utils";

export const EditableCell = ({
  getValue,
  row,
  column: { id, columnDef },
  table,
}: CellContext<SalaryAdvanceColumn, unknown>) => {
  const isInputTypeNumber = (columnDef.meta as ColumnMeta)?.type === "number";
  const initialValue = getValue();

  const [value, setValue] = useState(initialValue);

  const { auth } = useAuth();
  const fetchSalaryAdvanceDeadline = useFetchSalaryAdvanceDeadline();

  const isAdmin = auth.user?.role === "ADMIN";

  const deadline = fetchSalaryAdvanceDeadline.data?.deadline;

  const isLocked = deadline ? new Date(deadline) <= new Date() : false;

  const isEligible = () => {
    const hasBankDomiciliation =
      row.original.employee.hasBankDomiciliation === "oui";

    if (hasBankDomiciliation) {
      return false;
    }

    const absenceReasons = row.original.employee.attendance.absenceReasons;

    if (
      absenceReasons.some((absenceReason) =>
        ["MALADIE L-D", "MATERNITÉ"].includes(absenceReason.absenceReason)
      )
    ) {
      return false;
    }

    const totalAttendance = row.original.employee.attendance.totalAttendance;

    const { hours } = parseDuration(totalAttendance) ?? {
      hours: 0,
      minutes: 0,
    };

    if (hours < 40) {
      return false;
    }

    return true;
  };

  const isDisabled =
    fetchSalaryAdvanceDeadline.isPending ||
    ((isLocked || !isEligible()) && !isAdmin);

  const onBlur = () => {
    let finalValue = value;

    if (isInputTypeNumber) {
      const parsed = parseInt(value as string, 10);

      if (isNaN(parsed) || parsed < 0) {
        finalValue = 0;
      } else {
        finalValue = parsed;
      }

      setValue(finalValue);
    }

    (table.options.meta as TableMeta)?.updateData(row.index, id, finalValue);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isInputTypeNumber) {
      setValue(parseInt(value, 10) || "");
    } else {
      setValue(value);
    }
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      type={(columnDef.meta as ColumnMeta)?.type}
      value={value as string}
      onChange={onChange}
      onBlur={onBlur}
      disabled={isDisabled}
      className={cn("w-full", !isDisabled && "border-(--accent)")}
    />
  );
};
