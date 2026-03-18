import type { User } from "@/modules/auth/types";
import type { Employee } from "@/modules/employee/types";

export const RequestTypes = [
  "ATTESTATION_DE_TRAVAIL",
  "ATTESTATION_DE_SALAIRE",
  "FICHE_DE_PAIE",
  "DÉCLARATION_D_IMPÔTS",
  "RNE",
] as const;

export type RequestType = (typeof RequestTypes)[number];

export const RequestStatuses = [
  "SOUMIS",
  "TRAITÉ",
  "REJETÉ",
  "ANNULÉ",
  "CLÔTURÉ",
] as const;

export type RequestStatus = (typeof RequestStatuses)[number];

export type Request = {
  id: string;
  requestType: RequestType;
  comment?: string;
  status: RequestStatus;
  employee: Employee;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: User;
  updatedBy?: User;
};