import * as z from "zod";
import type { DefaultValues } from "react-hook-form";

import { RequestSchema } from "@/modules/request/schema";
import { AddOrUpdateModal } from "@/components/modals/AddOrUpdateModal";
import { useCreateRequest, useFetchRequest, useUpdateRequest } from "@/lib/data/request";
import { useFetchEmployees } from "@/lib/data/employee";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ErrorAlert";
import { RequestForm } from "./RequestForm";

interface SaveRequestModalProps {
  requestId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SaveRequestModal({ requestId, isOpen, onClose }: SaveRequestModalProps) {
  const { data: request, isLoading: isFetchRequestLoading, error: fetchRequestError } = useFetchRequest(requestId!);
  const { data: employees, isLoading: isFetchEmployeesLoading, error: fetchEmployeesError } = useFetchEmployees();

  const createRequest = useCreateRequest();
  const updateRequest = useUpdateRequest();

  const isLoading = isFetchRequestLoading || isFetchEmployeesLoading;
  const title = requestId ? "Modifier la demande" : "Créer une demande";
  const description = requestId ? "Modifier la demande" : "Créer une nouvelle demande";
  const action = requestId ? "Enregistrer" : "Créer";

  if (isLoading) {
    return (
      <AddOrUpdateModal isOpen={isOpen} onClose={onClose} title={title} description={description}>
        <Spinner className="absolute top-1/2 right-1/2 size-8" />
      </AddOrUpdateModal>
    );
  }

  if (fetchRequestError || fetchEmployeesError) {
    return (
      <AddOrUpdateModal isOpen={isOpen} onClose={onClose} title={title} description={description}>
        <ErrorAlert error={"Une erreur s'est produite."} />
      </AddOrUpdateModal>
    );
  }

  async function onSubmit(data: z.infer<typeof RequestSchema>) {
    if (request) {
      updateRequest.mutate({ id: request.id, data });
    } else {
      createRequest.mutate(data);
    }
    onClose();
  }

  const defaultValues: DefaultValues<z.infer<typeof RequestSchema>> = request
    ? { ...request, employee: request.employee.matricule }
    : { status: "SOUMIS", employee: undefined, requestType: undefined, comment: undefined };

  return (
    <AddOrUpdateModal isOpen={isOpen} onClose={onClose} title={title} description={description}>
      <RequestForm
        defaultValues={defaultValues}
        employees={employees || []}
        onSubmit={onSubmit}
        isLoading={isLoading}
        action={action}
        currentStatus={request?.status}
      />
    </AddOrUpdateModal>
  );
}