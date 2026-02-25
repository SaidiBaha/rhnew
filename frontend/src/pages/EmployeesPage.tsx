import { useState } from "react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/Loader";
import type { EmployeeColumn } from "@/modules/employee/components/columns";
import EmployeesClient from "@/modules/employee/components/EmployeesClient";
import { formatEmployee } from "@/modules/employee/utils";
import { useFetchEmployees, useSearchEmployees } from "@/lib/data/employee";

function EmployeesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const isSearching = search.length > 0;

  const { data: allData, error, isLoading } = useFetchEmployees(page);
  const { data: searchData, isFetching: isSearchFetching } = useSearchEmployees(search, 0);

  const activeData = isSearching ? searchData : allData;

  const formattedEmployees: EmployeeColumn[] = (activeData?.content || []).map(
    (employee: any) => formatEmployee(employee)
  );

  if (isLoading && !isSearching) return <Loader />;
  if (error) return <ErrorAlert error={error?.message || "Une erreur s'est produite."} />;

  return (
    <EmployeesClient
      data={formattedEmployees}
      page={page}
      totalPages={isSearching ? searchData?.totalPages || 1 : allData?.totalPages || 1}
      totalElements={isSearching ? searchData?.totalElements || 0 : allData?.totalElements || 0}
      onPageChange={setPage}
      searchQuery={search}
      onSearchChange={(val: string) => { setSearch(val); setPage(0); }}
      isSearching={isSearchFetching}
    />
  );
}

export default EmployeesPage;