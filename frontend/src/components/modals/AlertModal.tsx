import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
}: AlertModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <Modal
      title={"Êtes-vous sûr ?"}
      description={"Cette action ne peut pas être annulée."}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="pt-6 space-x-2 flex items-center justify-end">
        <Button variant="outline" disabled={loading} onClick={onClose}>
          Annuler
        </Button>

        <Button variant="destructive" disabled={loading} onClick={onConfirm}>
          Confirmer
        </Button>
      </div>
    </Modal>
  );
}
