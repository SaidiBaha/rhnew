import type { SaveAbsenceInput } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAbsenceRow(row: any): SaveAbsenceInput {
  // Normalise les clés : enlève les points et espaces
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const cleanKey = key.replace(/\./g, "").trim();
    normalized[cleanKey] = row[key];
  }

  const matricule  = String(normalized["Matricule"]  ?? normalized["MATRICULE"]  ?? "").trim();
  const rawDate    = normalized["Date"]  ?? normalized["DATE"];
  const date       = formatDate(rawDate);
  const horaire    = str(normalized["Horaire"]    ?? normalized["HORAIRE"]);
  const heureDebut = timeStr(normalized["Début"]  ?? normalized["DEBUT"] ?? normalized["Debut"]);
  const heureFin   = timeStr(normalized["Fin"]    ?? normalized["FIN"]);
  const heureEntree= timeStr(normalized["Entrée"] ?? normalized["ENTREE"] ?? normalized["Entree"]);
  const heureSortie= timeStr(normalized["Sortie"] ?? normalized["SORTIE"]);
  const motif      = str(normalized["Motif"]      ?? normalized["MOTIF"])?.toUpperCase() || undefined;
  const departement= str(normalized["Département"]?? normalized["Departement"] ?? normalized["DEPARTEMENT"]);

  return { matricule, date, horaire, heureDebut, heureFin, heureEntree, heureSortie, motif, departement };
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function timeStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return undefined;
    const parts = s.split(":");
    if (parts.length >= 2)
      return parts[0].padStart(2, "0") + ":" + parts[1].padStart(2, "0");
    return undefined;
  }
  if (v instanceof Date) {
    return String(v.getHours()).padStart(2, "0") + ":" + String(v.getMinutes()).padStart(2, "0");
  }
  if (typeof v === "number") {
    const totalMinutes = Math.round(v * 24 * 60);
    return String(Math.floor(totalMinutes / 60)).padStart(2, "0") + ":" + String(totalMinutes % 60).padStart(2, "0");
  }
  return undefined;
}

function formatDate(v: unknown): string {
  if (v instanceof Date) {
    // Use local date parts instead of toISOString() which uses UTC
    const year  = v.getFullYear();
    const month = String(v.getMonth() + 1).padStart(2, "0");
    const day   = String(v.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof v === "string") {
    const parts = v.split("/");
    if (parts.length === 3)
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    return v.slice(0, 10);
  }
  return "";
}