import type { Employee } from "@/modules/employee/types";

export type AttendanceRequest = {
  matricule: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalAttendance: string;
  overtime: string;
  absenceReason?: string;
  /** Nom du shift (ex: "Shift matin"). Facultatif. */
  horaire?: string;
  /** Heure de début planifiée "HH:MM". Facultatif. */
  debut?: string;
  /** Heure de fin planifiée "HH:MM". Facultatif. */
  fin?: string;
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
