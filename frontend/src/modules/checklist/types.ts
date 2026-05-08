export type ResponseType = "OK" | "NOK" | "NA";
export type InstanceStatus = "BROUILLON" | "COMPLETE";

export type ChecklistItemDto = {
  id: number;
  label: string;
  orderIndex: number;
};

export type ChecklistCategoryDto = {
  id?: number;
  name: string;
  orderIndex: number;
  items: ChecklistItemDto[];
};

export type ChecklistTemplateSummary = {
  id: number;
  title: string;
  description?: string;
  categoryCount: number;
  itemCount: number;
  createdAt?: string;
};

export type ChecklistTemplate = {
  id: number;
  title: string;
  description?: string;
  createdByName?: string;
  createdAt?: string;
  categories: ChecklistCategoryDto[];
};

export type ChecklistResponseDto = {
  id?: number;
  itemId: number;
  itemLabel?: string;
  response?: ResponseType;
  ecartDescription?: string;
};

export type ChecklistAssignmentDto = {
  id?: number;
  action?: string;
  responsable?: string;
  delai?: string;
  dateRealisation?: string;
};

export type ChecklistInstance = {
  id: number;
  templateId?: number;
  templateTitle?: string;
  auditId?: number | null;
  date?: string;
  lineUnit?: string;
  teamLeader?: string;
  auditor?: string;
  auditorVisa?: string;
  lineResponsible?: string;
  status: InstanceStatus;
  createdAt?: string;
  responses?: ChecklistResponseDto[];
  assignments?: ChecklistAssignmentDto[];
};

export type ChecklistInstancesPage = {
  content: ChecklistInstance[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  first: boolean;
  last: boolean;
};

// Request payloads
export type SaveTemplateRequest = {
  title: string;
  description?: string;
  categories: {
    id?: number;
    name: string;
    orderIndex: number;
    items: {
      id?: number;
      label: string;
      orderIndex: number;
    }[];
  }[];
};

export type SaveInstanceRequest = {
  templateId: number;
  auditId?: number | null;
  date?: string;
  lineUnit?: string;
  teamLeader?: string;
  auditor?: string;
  auditorVisa?: string;
  lineResponsible?: string;
  status?: InstanceStatus;
  responses: {
    itemId: number;
    response?: ResponseType;
    ecartDescription?: string;
  }[];
  assignments: ChecklistAssignmentDto[];
};
