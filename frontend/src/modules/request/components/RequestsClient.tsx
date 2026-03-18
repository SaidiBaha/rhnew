import { useState } from "react";
import { Plus, LayoutGrid, Table2 } from "lucide-react";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { DataTable } from "@/components/ui/DataTable";
import { columns, type RequestColumn } from "@/modules/request/components/columns";
import { SaveRequestModal } from "@/modules/request/components/SaveRequestModal";
import { RequestKanban } from "@/modules/request/components/RequestKanban";

interface RequestsClientProps {
  data: RequestColumn[];
}

export function RequestsClient({ data }: RequestsClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [view, setView] = useState<"kanban" | "table">("kanban");

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

        <div className="flex items-center gap-x-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                view === "kanban"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid className="size-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-gray-200 ${
                view === "table"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Table2 className="size-4" />
              Tableau
            </button>
          </div>

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

      {view === "kanban" ? (
        <RequestKanban data={data} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          globalFilterFn={"includesString"}
          showExport
        />
      )}
    </>
  );
}