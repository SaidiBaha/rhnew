import type { SaveAbsenceInput } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAbsenceRow(row: any): SaveAbsenceInput {
  // Normalise les clés : enlève les points, espaces, et normalise Unicode (NFC)
  // pour gérer les variantes d'encodage des caractères accentués (é, è, etc.)
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const cleanKey = key.replace(/\./g, "").trim().normalize("NFC");
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
    // Accepte "HH:MM" et "HH:MM:SS" — prend uniquement les deux premiers segments
    const parts = s.split(":");
    if (parts.length >= 2)
      return parts[0].padStart(2, "0") + ":" + parts[1].padStart(2, "0");
    return undefined;
  }
  if (v instanceof Date) {
    // SheetJS avec cellDates:true renvoie les heures comme Date (epoch 1899-12-31)
    // Utiliser les parties UTC pour éviter le décalage fuseau horaire
    return String(v.getUTCHours()).padStart(2, "0") + ":" + String(v.getUTCMinutes()).padStart(2, "0");
  }
  if (typeof v === "number") {
    // NaN ou Infinity → cellule vide / invalide
    if (!isFinite(v) || isNaN(v)) return undefined;
    // Fraction de jour (ex: 0.25 = 06:00) → minutes totales
    const totalMinutes = Math.round(v * 24 * 60);
    return String(Math.floor(totalMinutes / 60)).padStart(2, "0") + ":" + String(totalMinutes % 60).padStart(2, "0");
  }
  return undefined;
}

function formatDate(v: unknown): string {
  if (v instanceof Date) {
    // SheetJS avec cellDates:true retourne les dates Excel comme local midnight (ex: 2026-04-06T00:00:00+01:00).
    // getUTCDate() en UTC+1 retournerait J-1 → utiliser les méthodes locales.
    const year  = v.getFullYear();
    const month = String(v.getMonth() + 1).padStart(2, "0");
    const day   = String(v.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return "";
    // Format "dd/mm/yyyy"
    const parts = s.split("/");
    if (parts.length === 3)
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    // Format ISO ou "yyyy-mm-dd HH:MM:SS" → prendre les 10 premiers caractères
    return s.slice(0, 10);
  }
  if (typeof v === "number" && isFinite(v) && !isNaN(v)) {
    // Date sérielle Excel : l'époque est le 30 décembre 1899 UTC
    // (Excel a un bug off-by-2 sur 1900, géré via Dec 30 1899)
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    const year  = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day   = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return "";
}
