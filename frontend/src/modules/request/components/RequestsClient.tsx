import { useState } from "react";
import { Plus } from "lucide-react";

import { Heading } from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { DataTable } from "@/components/ui/DataTable";
import {
  columns,
  type RequestColumn,
} from "@/modules/request/components/columns";
import { SaveRequestModal } from "@/modules/request/components/SaveRequestModal";

interface RequestsClientProps {
  data: RequestColumn[];
}

export function RequestsClient({ data }: RequestsClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <SaveRequestModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <div className="flex items-center justify-between">
        <Heading
          title={`Demandes (${data.length})`}
          description={"Gérer les demandes."}
        />

        <div className="flex items-center justify-center gap-x-4">
          <button
            type="button"
            className="ds-btn-primary"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="size-4" />
            Ajouter
          </button>
        </div>
      </div>
      <Separator />
      <DataTable
        columns={columns}
        data={data}
        globalFilterFn={"includesString"}
        showExport
      />
    </>
  );
}
