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
