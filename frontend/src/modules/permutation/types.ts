export type PermutationStatus = "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE";

export type OperatorMini = {
    id: number;
    fullName: string;
    matricule?: string | null;
};

export type Permutation = {
    id: number;

    senderId: number;
    receiverId: number;
    operatorIds: number[];

    // ✅ nouveaux champs renvoyés par le backend
    operatorNames?: string[];          // ex: ["Ali Ben Salah", "Sami..."]
    operators?: OperatorMini[];        // ex: [{id, fullName, matricule}]

    senderFullName?: string | null;
    receiverFullName?: string | null;
    senderMatricule?: string | null;
    receiverMatricule?: string | null;

    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;

    asSender?: boolean;
    asReceiver?: boolean;
    productionLineId?: number | null;

    status: PermutationStatus;
    createdAt?: string;
    updatedAt?: string;

    autoRefusedMessage?: string | null;
};

export type PermutationCreatePayload = {
    operatorIds: number[];
    receiverId: number;
    productionLineId?: number | null;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
};
