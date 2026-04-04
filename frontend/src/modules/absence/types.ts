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
  heureDebut?: string;
};

export type AbsenceFilters = {
  dateFrom?: string;
  dateTo?: string;
  statut?: AbsenceStatut | "";
  search?: string;
  supervisorMatricule?: string;
  horaire?: string;
  departement?: string;
};

export type BulkUpdateInput = {
  ids: number[];
  statut: "PRESENT" | "ABSENT";
  heureEntree?: string;
};

export type EmployeeAbsenceSummary = {
  matricule: string;
  fullName: string;
  departement?: string;
  joursPresent: number;
  joursAbsent: number;
};
