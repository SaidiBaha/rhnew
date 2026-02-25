import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/Loader";
import { AttendancesClient } from "@/modules/attendance/components/AttendancesClient";
import type { EmployeeAttendanceColumn } from "@/modules/attendance/components/columns";
import { formatEmployee } from "@/modules/employee/utils";
import { useFetchEmployeeAttendancesForCurrentMonth } from "@/lib/data/attendance";
import { useEffect } from "react";
import { displayError, logError } from "@/modules/employee/api-error";


function AttendancesPage() {
  const {
    data: employeeAttendances,
    error,
    isLoading,
    isFetching,
  } = useFetchEmployeeAttendancesForCurrentMonth();

  // Logger l'erreur dans la console quand elle survient
  useEffect(() => {
    if (error) {
      logError("AttendancesPage - fetch", error);
    }
  }, [error]);

  const formattedAttendances: EmployeeAttendanceColumn[] = (
    employeeAttendances ?? []
  ).map((employeeAttendance) => ({
    employee: formatEmployee(employeeAttendance.employee),
    attendance: employeeAttendance.attendance,
  }));

  if (isLoading || isFetching) {
    return <Loader />;
  }

  if (error) {
    const errorMessage = displayError(error, "Erreur lors du chargement des pointages");
    return <ErrorAlert error={errorMessage} />;
  }

  return <AttendancesClient data={formattedAttendances} />;
}

export default AttendancesPage;
