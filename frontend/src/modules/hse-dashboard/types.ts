export type HseKpi = {
  totalAudits: number;
  termine: number;
  enCours: number;
  enRetard: number;
  annule: number;
  completedLate: number;
  tauxCompletion: number;
  scoreMoyenGlobal: number | null;
};

export type HseStatusDistributionItem = {
  status: string;
  count: number;
  percentage: number;
};

export type HseByLineItem = {
  lineZone: string;
  total: number;
  enAttente: number;
  enCours: number;
  termine: number;
  enRetard: number;
  annule: number;
};

export type HseScoreByLineItem = {
  lineZone: string;
  scoreMoyen: number;
  nbChecklists: number;
};

export type HseTimelineItem = {
  month: string;
  planifies: number;
  termines: number;
};

export type HseNokPointItem = {
  itemId: number;
  itemLabel: string;
  categoryName: string;
  nokCount: number;
};

export type HseNokCategoryItem = {
  categoryName: string;
  nokCount: number;
};

export type HseAuditorPerformanceItem = {
  employeeId: number;
  fullName: string;
  matricule: string;
  nbAssigned: number;
  nbTermine: number;
  nbEnRetard: number;
  scoreMoyen: number | null;
  tauxCompletion: number;
};

export type HseNonConformityReportItem = {
  dateAudit: string;
  lineZone: string;
  auditor: string;
  numero: number;
  categoryName: string;
  itemLabel: string;
  ecartDescription: string;
  hasPhotos: boolean;
};

export type HseLineSummaryReportItem = {
  lineZone: string;
  nbAudits: number;
  scoreMoyen: number | null;
  nbNok: number;
  niveauDominant: string;
};

export type HseLateAuditReportItem = {
  auditId: number;
  datePrevue: string;
  lineZone: string;
  auditorName: string;
  nbJoursRetard: number;
  completedLate: boolean;
};

export type HseConformityLevels = Record<string, number>;

export type HseDashboardFilters = {
  dateFrom?: string;
  dateTo?: string;
  lineZone?: string;
  auditorId?: number;
};
