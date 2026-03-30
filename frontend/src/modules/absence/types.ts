export type AbsenceStatut = "ABSENT" | "PRESENT" | "PENDING";

export type Absence = {
  id: number;
  matricule: string;
  fullName: string;
  departement?: string;
  date: string;
  horaire?: string;
  heureDebut?: string;
  heureFin?: string;
  heureEntree?: string;
  heureSortie?: string;
  statut: AbsenceStatut;
  motif?: string;
};

export type SaveAbsenceInput = {
  matricule: string;
  date: string;
  horaire?: string;
  heureDebut?: string;
  heureFin?: string;
  heureEntree?: string;
  heureSortie?: string;
  motif?: string;
  departement?: string;
};

export type UpdateAbsenceInput = {
  motif?: string;
  statut?: AbsenceStatut;
  heureEntree?: string;
  heureSortie?: string;
};

export type AbsenceFilters = {
  dateFrom?: string;
  dateTo?: string;
  statut?: AbsenceStatut | "";
  search?: string;
  supervisorMatricule?: string;
  horaire?: string;
};