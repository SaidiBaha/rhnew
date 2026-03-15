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

    if (!targetKey) {
      console.warn(`Ligne ${rowIndex}: Colonne "${key}" ignorée (non reconnue)`);
      return;
    }

    const value = row[key];
    normalizedRow[targetKey] = value;
  });

  const result = AttendanceSchema.safeParse(normalizedRow);

  if (!result.success) {
    const error = result.error.issues[0];
    
    // Construction d'un message d'erreur plus détaillé
    const fieldName = error.path.join(" > ");
    const errorMessage = error.message;
    
    throw new Error(
      `Ligne ${rowIndex}: Erreur sur le champ "${fieldName}" - ${errorMessage}`
    );
  }
  
  return result.data;
}