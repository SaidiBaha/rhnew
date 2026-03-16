import type { Attendance } from "../attendance/types";

export const Civilities = ["MADAME", "MONSIEUR", "MLLE"] as const;

export type Civility = (typeof Civilities)[number];

export type Department = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type JobTitle = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type ProductionLine = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type Shift = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type EmploymentType = {
  id: string;
  type: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type Employee = {
  id: string;
  matricule: string;
  civility: Civility;
  fullName: string;
  department: Department;
  jobTitle: JobTitle;
  productionLine?: ProductionLine;
  shift?: Shift;
  employmentType: EmploymentType;
  hireDate: Date;
  supervisor?: Employee;
  operators?: Employee[];
  attendance: Attendance;
  hasBankDomiciliation: boolean;
  email?: string;
  createdAt: Date;
  updatedAt?: Date;
   free: boolean;
};

export type EmployeeRequest = {
  matricule: string;
  civility: Civility;
  fullName: string;
  department: string;
  jobTitle: string;
  productionLine?: string;
  shift?: string;
  employmentType: string;
  hireDate: Date;
  supervisor?: string;
  hasBankDomiciliation: boolean;
  email?: string;
   free: boolean;
};

export type PageResponse<T> = {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ErrorDto = {
  code?: string | number;
  httpCode?: number;
  message?: string;
  errors?: string[];
};

