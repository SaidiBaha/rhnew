import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/Loader";
import { RequestsClient } from "@/modules/request/components/RequestsClient";
import { useFetchRequests } from "@/lib/data/request";
import { formatRequest } from "@/modules/request/utils";

function RequestsPage() {
  const { data, error, isLoading, isFetching } = useFetchRequests();

  const formattedRequests = (data?.data || []).map((request) =>
    formatRequest(request)
  );

  if (isLoading || isFetching) {
    return <Loader />;
  }

  if (error) {
    return (
      <ErrorAlert error={error?.message || "Une erreur s'est produite."} />
    );
  }

  return <RequestsClient data={formattedRequests} />;
}

export default RequestsPage;
