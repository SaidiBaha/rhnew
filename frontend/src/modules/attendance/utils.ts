import type z from "zod";

import { AttendanceSchema } from "@/modules/attendance/schema";

const COLUMN_MAP: Record<string, keyof z.infer<typeof AttendanceSchema>> = {
  matricule: "matricule",
  date: "date",
  entrée: "clockIn",
  sortie: "clockOut",
  "présence planning": "totalAttendance",
  "h sup": "overtime",
  motif: "absenceReason",
};

export function parseAttendance(row: any, index: number) {
  const normalizedRow: { [key: string]: any } = {};
  const rowIndex = index + 2;

  Object.keys(row).forEach((key) => {
    const normalizedKey = key.toLowerCase().trim();
    const targetKey = COLUMN_MAP[normalizedKey];

    if (!targetKey) return;

    const value = row[key];

    normalizedRow[targetKey] = value;
  });

  const result = AttendanceSchema.safeParse(normalizedRow);

  if (!result.success) {
    const error = result.error.issues[0];

    throw new Error(
      `Ligne ${rowIndex}: [${error.path.join(" > ")}]: ${error.message} `
    );
  }
  return result.data;
}
