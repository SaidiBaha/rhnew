import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useManualPresenceSave } from "../hooks/useManualPresenceSave";
import type { DailyAttendance } from "../types";
import type { Employee } from "@/modules/employee/types";

// ─── Types internes ───────────────────────────────────────────────────────────

interface ShiftOption {
  label: string;
  debut: string;
  fin: string;
}

const SHIFTS: ShiftOption[] = [
  { label: "Shift matin",    debut: "06:00", fin: "14:00" },
  { label: "Après-midi",     debut: "14:00", fin: "22:00" },
  { label: "Shift nuit",     debut: "22:00", fin: "06:00" },
  { label: "ADM",            debut: "08:00", fin: "17:00" },
];

const ABSENCE_MOTIFS = [
  "CONGE PAYE",
  "CONGE NON PAYE",
  "AUTORISATION AF-PER",
  "CHÔMAGE TECHNIQUE",
  "MALADIE CD",
  "MALADIE L-D",
];

const DEFAULT_MOTIF = "CONGE PAYE";

// ─── Helpers timezone Africa/Tunis ────────────────────────────────────────────

function getTunisHour(): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Tunis",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
}

function getTunisDateFormatted(): string {
  return new Date().toLocaleDateString("fr-FR", {
    timeZone: "Africa/Tunis",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function detectShift(): ShiftOption {
  const h = getTunisHour();
  if (h >= 5 && h <= 13) return SHIFTS[0];  // Shift matin
  if (h >= 14 && h <= 21) return SHIFTS[1]; // Après-midi
  return SHIFTS[2];                          // Shift nuit (22-23 et 00-04)
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  existingRecords: DailyAttendance[];
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function ManualPresenceModal({
  isOpen,
  onClose,
  employees,
  existingRecords,
}: Props) {
  const save = useManualPresenceSave();

  const [horaire, setHoraire] = useState<string>(SHIFTS[0].label);
  const [debut, setDebut] = useState<string>(SHIFTS[0].debut);
  const [fin, setFin] = useState<string>(SHIFTS[0].fin);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  // motif par employé (uniquement pour les absents)
  const [motifs, setMotifs] = useState<Map<number, string>>(new Map());

  const todayFormatted = useMemo(() => getTunisDateFormatted(), []);
  const isEditMode = existingRecords.length > 0;

  // Initialise les valeurs à chaque ouverture
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode) {
      const first = existingRecords[0];
      if (first.horaire) setHoraire(first.horaire);
      if (first.debut)   setDebut(first.debut);
      if (first.fin)     setFin(first.fin);

      const presentMatricules = new Set(
        existingRecords
          .filter((r) => r.clockIn && r.clockIn !== "00:00")
          .map((r) => r.matricule)
      );
      const presentIds = new Set<number>();
      const initialMotifs = new Map<number, string>();
      employees.forEach((emp) => {
        const id = Number(emp.id);
        if (presentMatricules.has(emp.matricule)) {
          presentIds.add(id);
        } else {
          const rec = existingRecords.find((r) => r.matricule === emp.matricule);
          initialMotifs.set(id, rec?.absenceReason ?? DEFAULT_MOTIF);
        }
      });
      setCheckedIds(presentIds);
      setMotifs(initialMotifs);
    } else {
      const detected = detectShift();
      setHoraire(detected.label);
      setDebut(detected.debut);
      setFin(detected.fin);
      setCheckedIds(new Set(employees.map((e) => Number(e.id))));
      setMotifs(new Map());
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Met à jour debut/fin quand le shift change (depuis le sélecteur)
  function handleHoraireChange(newHoraire: string) {
    setHoraire(newHoraire);
    const shiftOpt = SHIFTS.find((s) => s.label === newHoraire);
    if (shiftOpt) {
      setDebut(shiftOpt.debut);
      setFin(shiftOpt.fin);
    }
  }

  function toggleEmployee(id: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Affecte motif par défaut à l'absent
        setMotifs((m) => {
          const nm = new Map(m);
          nm.set(id, DEFAULT_MOTIF);
          return nm;
        });
      } else {
        next.add(id);
        // Supprime le motif quand re-coché
        setMotifs((m) => {
          const nm = new Map(m);
          nm.delete(id);
          return nm;
        });
      }
      return next;
    });
  }

  function toggleAll() {
    if (checkedIds.size === employees.length) {
      setCheckedIds(new Set());
      const allMotifs = new Map<number, string>();
      employees.forEach((e) => allMotifs.set(Number(e.id), DEFAULT_MOTIF));
      setMotifs(allMotifs);
    } else {
      setCheckedIds(new Set(employees.map((e) => Number(e.id))));
      setMotifs(new Map());
    }
  }

  function handleMotifChange(id: number, value: string) {
    setMotifs((m) => {
      const nm = new Map(m);
      nm.set(id, value);
      return nm;
    });
  }

  const presentCount = checkedIds.size;
  const absentCount = employees.length - presentCount;
  const allChecked = employees.length > 0 && checkedIds.size === employees.length;
  const someChecked = checkedIds.size > 0 && checkedIds.size < employees.length;

  async function handleSave() {
    const entries = employees.map((emp) => {
      const id = Number(emp.id);
      const present = checkedIds.has(id);
      return {
        employeeId: id,
        present,
        absenceReason: present ? null : (motifs.get(id) ?? DEFAULT_MOTIF),
      };
    });

    await save.mutateAsync({
      input: { horaire, debut, fin, entries },
      meta: { presentCount, absentCount, date: todayFormatted },
    });

    onClose();
  }

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Drawer */}
      <div
        className="flex h-full w-full flex-col shadow-2xl sm:max-w-xl"
        style={{
          background: "var(--white)",
          borderLeft: "1px solid var(--border)",
          overflowY: "hidden",
        }}
      >
        {/* ── En-tête ────────────────────────────────────────────────────── */}
        <div
          className="flex shrink-0 items-start justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {isEditMode ? "Modifier la saisie" : "Ajouter présences / absences"}
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>
              Jour courant — <span className="font-mono-data">{todayFormatted}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            style={{ color: "var(--muted)" }}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Champs date + shift + horaires ────────────────────────────── */}
        <div
          className="shrink-0 space-y-4 px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* Date — lecture seule */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
              Date
            </label>
            <input
              type="text"
              readOnly
              value={todayFormatted}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border)",
                color: "var(--text2)",
                background: "var(--bg)",
                cursor: "not-allowed",
              }}
            />
          </div>

          {/* Shift */}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
              Shift / Horaire
            </label>
            <select
              value={horaire}
              onChange={(e) => handleHoraireChange(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
                background: "var(--white)",
              }}
            >
              {SHIFTS.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Heures d'entrée / sortie */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Heure d'entrée (Début)
              </label>
              <input
                type="time"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--white)" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
                Heure de sortie (Fin)
              </label>
              <input
                type="time"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--white)" }}
              />
            </div>
          </div>
        </div>

        {/* ── En-tête liste employés ─────────────────────────────────────── */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-3"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        >
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium" style={{ color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked; }}
              onChange={toggleAll}
              className="h-4 w-4 rounded"
              aria-label="Sélectionner tous"
            />
            Sélectionner tous
          </label>
          <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
            <span style={{ color: "#00a87a" }}>{presentCount} présent{presentCount !== 1 ? "s" : ""}</span>
            {" · "}
            <span style={{ color: "#f03e3e" }}>{absentCount} absent{absentCount !== 1 ? "s" : ""}</span>
          </span>
        </div>

        {/* ── Liste scrollable des employés ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {employees.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
              Aucun employé trouvé dans votre équipe.
            </div>
          ) : (
            employees.map((emp) => {
              const id = Number(emp.id);
              const isPresent = checkedIds.has(id);
              return (
                <div
                  key={emp.id}
                  className="px-6 py-3 transition-colors hover:bg-gray-50"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isPresent}
                      onChange={() => toggleEmployee(id)}
                      className="h-4 w-4 shrink-0 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono-data text-xs font-semibold"
                          style={{ color: "var(--muted)" }}
                        >
                          {emp.matricule}
                        </span>
                        <span
                          className="truncate text-sm font-medium"
                          style={{ color: "var(--text)" }}
                        >
                          {emp.fullName}
                        </span>
                      </div>
                      {emp.department && (
                        <div className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
                          {emp.department.name}
                        </div>
                      )}
                    </div>
                    {/* Badge statut temps réel */}
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={
                        isPresent
                          ? { background: "rgba(0,168,122,0.1)", color: "#00a87a" }
                          : { background: "rgba(240,62,62,0.1)", color: "#f03e3e" }
                      }
                    >
                      {isPresent ? "Présent" : "Absent"}
                    </span>
                  </label>

                  {/* Motif — affiché uniquement pour les absents */}
                  {!isPresent && (
                    <div className="mt-2 pl-7">
                      <select
                        value={motifs.get(id) ?? DEFAULT_MOTIF}
                        onChange={(e) => handleMotifChange(id, e.target.value)}
                        className="w-full rounded-lg border px-3 py-1.5 text-xs outline-none focus:ring-2"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--text2)",
                          background: "var(--white)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ABSENCE_MOTIFS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Pied de page ───────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-6 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
            Les employés non sélectionnés seront marqués comme absents.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={save.isPending}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={save.isPending || employees.length === 0}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {save.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
