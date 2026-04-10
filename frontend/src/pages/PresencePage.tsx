import { Loader } from "@/components/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PresenceClient } from "@/modules/presence/components/PresenceClient";
import { useFetchTodayPresence } from "@/modules/presence/hooks/useFetchTodayPresence";
import { logError, displayError } from "@/modules/employee/api-error";
import { useEffect } from "react";

function PresencePage() {
  const { data, error, isLoading, isFetching } = useFetchTodayPresence();

  useEffect(() => {
    if (error) logError("PresencePage - fetch", error);
  }, [error]);

  if (isLoading || isFetching) return <Loader />;

  if (error) {
    return (
      <ErrorAlert
        error={displayError(error, "Erreur lors du chargement des présences")}
      />
    );
  }

  return <PresenceClient data={data ?? []} />;
}

export default PresencePage;
