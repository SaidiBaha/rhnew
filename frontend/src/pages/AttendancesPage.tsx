import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/Loader";
import { AttendancesClient } from "@/modules/attendance/components/AttendancesClient";
import type { EmployeeAttendanceColumn } from "@/modules/attendance/components/columns";
import { formatEmployee } from "@/modules/employee/utils";
import { useFetchEmployeeAttendancesForCurrentMonth } from "@/lib/data/attendance";

function AttendancesPage() {
  const {
    data: employeeAttendances,
    error,
    isLoading,
    isFetching,
  } = useFetchEmployeeAttendancesForCurrentMonth();

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
    return (
      <ErrorAlert error={error?.message || "Une erreur s'est produite."} />
    );
  }

  return <AttendancesClient data={formattedAttendances} />;
}

export default AttendancesPage;
