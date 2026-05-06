import type { PresenceImportRecord } from "../types";

/* ─────────────────────────────────────────────────────────────
   HELPERS INTERNES
   ───────────────────────────────────────────────────────────── */

/** Normalise un header Excel : retire le point final, passe en minuscule. */
function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/\.+$/, "").trim();
}

/** Cherche une valeur dans une ligne par clé normalisée. */
function findValue(row: Record<string, unknown>, normalizedKey: string): unknown {
  for (const [k, v] of Object.entries(row)) {
    if (normalizeKey(k) === normalizedKey) return v;
  }
  return undefined;
}

/**
 * Normalise une valeur horaire.
 * Accepte : "HH:MM", "H:MM", "HH:MM:SS"
 * Retourne : "HH:MM" ou null si vide / NaN.
 */
function normalizeTime(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === "nan") return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/**
 * Normalise une valeur de date vers "YYYY-MM-DD".
 * Gère : "YYYY-MM-DD", "DD/MM/YYYY", "D/M/YYYY".
 */
function normalizeDate(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === "nan") return null;

  // YYYY-MM-DD (produit par dateNF: 'yyyy-mm-dd')
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);

  // DD/MM/YYYY ou D/M/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  return null;
}

/** Convertit "HH:MM" en minutes. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Convertit des minutes en "HH:MM". */
function minutesToTime(total: number): string {
  if (total <= 0) return "00:00";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Retourne la date du jour en timezone Africa/Tunis au format "YYYY-MM-DD". */
function getTodayTunis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(
    new Date()
  );
}

/* ─────────────────────────────────────────────────────────────
   VALIDATION DES DATES
   ───────────────────────────────────────────────────────────── */

/**
 * Vérifie que les 4 premières ET les 4 dernières dates uniques
 * de la colonne "Date." sont toutes égales à la date du jour (Africa/Tunis).
 *
 * Lance une Error si la condition n'est pas respectée.
 */
export function validateAttendanceDates(rows: unknown[]): void {
  const seen = new Set<string>();
  const uniqueDates: string[] = [];

  for (const raw of rows) {
    const row = raw as Record<string, unknown>;
    const date = normalizeDate(findValue(row, "date"));
    if (date && !seen.has(date)) {
      seen.add(date);
      uniqueDates.push(date);
    }
  }

  const today = getTodayTunis();
  const [y, mo, d] = today.split("-");
  const todayFR = `${d}/${mo}/${y}`;

  const first4 = uniqueDates.slice(0, 4);
  const last4 = uniqueDates.slice(-4);
  const allValid = [...first4, ...last4].every((dt) => dt === today);

  if (!allValid) {
    throw new Error(
      `Les dates dans le fichier ne correspondent pas à la date du jour courant (${todayFR}). Veuillez importer le fichier du jour.`
    );
  }
}

/* ─────────────────────────────────────────────────────────────
   PARSING DU FORMAT PRÉSENCE (2 shifts → 1 enregistrement)
   ───────────────────────────────────────────────────────────── */

/**
 * Format attendu (colonnes Excel) :
 *   A – Matricule.   B – Prénom.    C – Date.     D – Horaire.
 *   E – Début.       F – Fin.       G – Entrée.   H – Sortie.
 *   I – Motif        J – Département
 *
 * Règles de regroupement :
 *   – Un employé peut avoir 2 lignes (2 shifts) pour le même jour.
 *   – clockIn  = earliest Entrée non nulle des 2 lignes.
 *   – clockOut = latest  Sortie non nulle des 2 lignes.
 *   – totalAttendance = somme des durées planifiées (Fin – Début).
 *   – overtime = "00:00" (non calculable depuis ce format).
 *   – absenceReason = premier Motif non vide.
 */
export function parseNewAttendanceFormat(jsonData: unknown[]): PresenceImportRecord[] {
  type GroupEntry = {
    matricule: string;
    date: string;
    clockIn: string | null;
    clockOut: string | null;
    totalMinutes: number;
    absenceReason: string | null;
    horaire: string | null;
    debut: string | null;
    fin: string | null;
  };

  const groups = new Map<string, GroupEntry>();

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i] as Record<string, unknown>;
    const rowNum = i + 2;

    // ── Matricule ──
    const rawMatricule = findValue(row, "matricule");
    if (rawMatricule == null || String(rawMatricule).trim() === "") {
      throw new Error(`Ligne ${rowNum} : Matricule manquant.`);
    }
    const matricule = String(rawMatricule).trim().replace(/\.0+$/, "");

    // ── Date ──
    const date = normalizeDate(findValue(row, "date"));
    if (!date) {
      throw new Error(`Ligne ${rowNum} : Date invalide ou manquante.`);
    }

    // ── Horaires ──
    const debut = normalizeTime(findValue(row, "début"));
    const fin = normalizeTime(findValue(row, "fin"));
    const entree = normalizeTime(findValue(row, "entrée"));
    const sortie = normalizeTime(findValue(row, "sortie"));

    const rawHoraire = findValue(row, "horaire");
    const horaire =
      rawHoraire != null &&
      String(rawHoraire).trim() !== "" &&
      String(rawHoraire).trim().toLowerCase() !== "nan"
        ? String(rawHoraire).trim()
        : null;

    const shiftMinutes =
      debut && fin
        ? Math.max(0, timeToMinutes(fin) - timeToMinutes(debut))
        : 0;

    // ── Motif ──
    const rawMotif = findValue(row, "motif");
    const motif =
      rawMotif != null &&
      String(rawMotif).trim() !== "" &&
      String(rawMotif).trim().toLowerCase() !== "nan"
        ? String(rawMotif).trim().toUpperCase()
        : null;

    // ── Regroupement ──
    const key = `${matricule}|${date}`;

    if (!groups.has(key)) {
      groups.set(key, {
        matricule,
        date,
        clockIn: entree,
        clockOut: sortie,
        totalMinutes: shiftMinutes,
        absenceReason: motif,
        horaire,
        debut,
        fin,
      });
    } else {
      const g = groups.get(key)!;

      if (entree && (!g.clockIn || timeToMinutes(entree) < timeToMinutes(g.clockIn))) {
        g.clockIn = entree;
      }
      if (sortie && (!g.clockOut || timeToMinutes(sortie) > timeToMinutes(g.clockOut))) {
        g.clockOut = sortie;
      }
      g.totalMinutes += shiftMinutes;
      if (!g.absenceReason && motif) g.absenceReason = motif;
      if (horaire && !g.horaire) {
        g.horaire = horaire;
      } else if (horaire && g.horaire && horaire !== g.horaire) {
        g.horaire = `${g.horaire} / ${horaire}`;
      }
      if (debut && (!g.debut || timeToMinutes(debut) < timeToMinutes(g.debut))) {
        g.debut = debut;
      }
      if (fin && (!g.fin || timeToMinutes(fin) > timeToMinutes(g.fin))) {
        g.fin = fin;
      }
    }
  }

  return Array.from(groups.values()).map((g) => ({
    matricule: g.matricule,
    date: g.date,
    clockIn: g.clockIn ?? "00:00",
    clockOut: g.clockOut ?? "00:00",
    totalAttendance: minutesToTime(g.totalMinutes),
    overtime: "00:00",
    ...(g.absenceReason ? { absenceReason: g.absenceReason } : {}),
    ...(g.horaire ? { horaire: g.horaire } : {}),
    ...(g.debut ? { debut: g.debut } : {}),
    ...(g.fin ? { fin: g.fin } : {}),
  }));
}
