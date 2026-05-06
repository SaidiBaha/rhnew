export type PermutationStatus = "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "TERMINEE";
export type TypePermutation = "ENVOYER" | "RECEVOIR";

export type OperatorMini = {
    id: number;
    fullName: string;
    matricule?: string | null;
    free: boolean;

    supervisorId?: number | null;
    supervisorFullName?: string | null;
    supervisorMatricule?: string | null;
};

export type EmployeeFreeRequest = {
    employeeIds: number[];
};

export type Permutation = {
    id: number;

    // ✅ receiverId peut être null en mode RECEVOIR (selon ta règle actuelle)
    senderId: number;
    receiverId: number | null;

    operatorIds: number[];

    // ✅ nouveaux champs renvoyés par le backend
    operatorNames?: string[]; // ex: ["Ali Ben Salah", "Sami..."]
    operators?: OperatorMini[]; // ex: [{id, fullName, matricule}]

    senderFullName?: string | null;
    receiverFullName?: string | null;
    senderMatricule?: string | null;
    receiverMatricule?: string | null;

    typePermutation: TypePermutation;

    // ✅ RECEVOIR = seulement aujourd'hui (même date)
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
    // ✅ ENVOYER: receiverId obligatoire, senderId absent (backend = current user)
    // ✅ RECEVOIR: receiverId = null, senderId absent (plus de choix superviseur)
    typePermutation: TypePermutation;

    operatorIds: number[];

    receiverId: number | null;
    productionLineId?: number | null;

    // ✅ ENVOYER: dates/time choisis
    // ✅ RECEVOIR: startDate=endDate=today (front le force)
    startDate: string;
    endDate: string;

    startTime: string;
    endTime: string;

    // ✅ gardé optionnel pour compat mais tu peux le supprimer si backend ne l’accepte plus
    senderId?: number;
};
