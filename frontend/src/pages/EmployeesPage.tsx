import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/Loader";
import type { EmployeeColumn } from "@/modules/employee/components/columns";
import { EmployeesClient } from "@/modules/employee/components/EmployeesClient";
import { formatEmployee } from "@/modules/employee/utils";
import { useFetchEmployees } from "@/lib/data/employee";

function EmployeesPage() {
  const { data: employees, error, isLoading, isFetching } = useFetchEmployees();

  const formattedEmployees: EmployeeColumn[] = (employees || []).map(
    (employee) => formatEmployee(employee)
  );

  if (isLoading || isFetching) {
    return <Loader />;
  }

  if (error) {
    return (
      <ErrorAlert error={error?.message || "Une erreur s'est produite."} />
    );
  }

  return <EmployeesClient data={formattedEmployees} />;
}

export default EmployeesPage;
