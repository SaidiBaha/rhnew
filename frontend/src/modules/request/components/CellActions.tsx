import { useState } from "react";
import { Edit } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { RequestColumn } from "@/modules/request/components/columns";
import { SaveRequestModal } from "@/modules/request/components/SaveRequestModal";

interface CellActionsProps {
  data: RequestColumn;
}

export function CellActions({ data }: CellActionsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <SaveRequestModal
        requestId={data.id}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <Button size="icon" variant="ghost" onClick={() => setIsFormOpen(true)}>
        <Edit className="size-4" />
      </Button>
    </>
  );
}
