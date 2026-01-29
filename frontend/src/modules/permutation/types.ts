export type PermutationStatus = "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE";
export type TypePermutation = "ENVOYER" | "RECEVOIR";
export type OperatorMini = {
    id: number;
    fullName: string;
    matricule?: string | null;
    free: boolean;

};
export type EmployeeFreeRequest = {
  employeeIds: number[];
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
    typePermutation: TypePermutation;
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
    senderId?: number;  
    operatorIds: number[];
   
    receiverId: number | null;
    productionLineId?: number | null;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
};
