import type { Employee } from "@/modules/employee/types";

export type AttendanceRequest = {
  matricule: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalAttendance: string;
  overtime: string;
  absenceReason?: string;
};

export type Attendance = {
  totalDays: number;
  totalAttendance: string;
  totalOvertime: string;
  absenceReasons: { absenceReason: string; count: number }[];
};

export type EmployeeAttendace = {
  employee: Employee;
  attendance: Attendance;
};

export type TodayAttendance = {
  matricule: string;
  fullName: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  clockIn: string | null;
  clockOut: string | null;
  status: "PRESENT" | "ABSENT" | null;
};

export type AbsenceRow = {
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
  status: "PRESENT" | "ABSENT" | null;
  motif?: string;
};