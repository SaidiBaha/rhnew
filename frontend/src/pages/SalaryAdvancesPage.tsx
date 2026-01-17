import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/Loader";
import type { SalaryAdvanceColumn } from "@/modules/salary-advance/components/columns";
import { SalaryAdvancesClient } from "@/modules/salary-advance/components/SalaryAdvancesClient";
import { formatSalaryAdvance } from "@/modules/salary-advance/utils";
import { useFetchSalaryAdvances } from "@/lib/data/salary-advance";

function SalaryAdvancesPage() {
  const { data, error, isLoading, isFetching } = useFetchSalaryAdvances();

  const formattedSalaryAdvances: SalaryAdvanceColumn[] = (data?.data || []).map(
    (salaryAdvance) => formatSalaryAdvance(salaryAdvance)
  );

  if (isLoading || isFetching) {
    return <Loader />;
  }

  if (error) {
    return (
      <ErrorAlert error={error?.message || "Une erreur s'est produite."} />
    );
  }

  return <SalaryAdvancesClient data={formattedSalaryAdvances} />;
}

export default SalaryAdvancesPage;
