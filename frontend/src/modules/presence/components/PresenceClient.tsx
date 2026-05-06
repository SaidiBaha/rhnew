import { useState, useMemo, useCallback } from "react";
import { ClipboardList, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import { DataTable } from "@/components/ui/DataTable";
import {
  validateAttendanceDates,
  parseNewAttendanceFormat,
} from "../utils/parsePresenceFormat";
import { logError, showErrorToast } from "@/modules/employee/api-error";

import { useImportPresence } from "../hooks/useImportPresence";
import { useFetchTodayImportStatus } from "../hooks/useFetchTodayImportStatus";
import { useFetchEmployeesForFilters } from "@/modules/employee/hooks/useFetchEmployeesForFilters";
import { useToggleAppele } from "../hooks/useToggleAppele";
import { buildColumns } from "./columns";
import { EditAttendanceModal } from "./EditAttendanceModal";
import { ManualPresenceModal } from "./ManualPresenceModal";
import { computeStatus } from "../utils/status";
import type { DailyAttendance, PresenceStatus } from "../types";
import type { PresenceRow } from "./columns";
import useAuth from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | PresenceStatus;
type AppeleFilter = "ALL" | "APPELE" | "NON_APPELE";

// ─── Stats cards ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  sub: string;
  accentColor: string;
  accentBg: string;
  isActive: boolean;
  filter: StatusFilter;
  onSelect: (f: StatusFilter) => void;
}

function StatCard({
  label,
  value,
  sub,
  accentColor,
  accentBg,
  isActive,
  filter,
  onSelect,
}: StatCardProps) {
  const handleActivate = useCallback(() => {
    onSelect(isActive ? "ALL" : filter);
  }, [isActive, filter, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleActivate();
      }
    },
    [handleActivate]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`${label}, ${value} employé${value !== 1 ? "s" : ""}. ${isActive ? "Filtre actif — cliquer pour effacer." : "Cliquer pour filtrer."}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      style={{
        position: "relative",
        padding: "16px 20px",
        borderRadius: "var(--radius)",
        background: isActive ? accentBg : "var(--white)",
        border: isActive
          ? `2px solid ${accentColor}`
          : "2px solid var(--border)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        userSelect: "none",
        outline: "none",
      }}
      onFocus={(e) =>
        (e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}33`)
      }
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Active indicator dot */}
      {isActive && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accentColor,
          }}
        />
      )}

      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text2)",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        className="font-mono-data"
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: isActive ? accentColor : "var(--text)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: isActive ? accentColor : "var(--muted)",
          marginTop: 4,
          fontWeight: 500,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: DailyAttendance[];
}

export function PresenceClient({ data }: Props) {
  const { auth } = useAuth();

  const role = auth.user?.role;
  const isSupervisor = role === "SUPERVISOR";
  const isNurse = role === "NURSE";

  const canImport = role
    ? (["ADMIN", "SUPER_ADMIN", "SUPERVISOR"] as string[]).includes(role)
    : false;

  const canEdit = role
    ? (["ADMIN", "SUPER_ADMIN", "SUPERVISOR", "NURSE"] as string[]).includes(role)
    : false;

  // NURSE : filtre par défaut = ABSENT. Autres rôles : ALL.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isNurse ? "ABSENT" : "ALL"
  );
  // Filtre appelé — NURSE uniquement
  const [appeleFilter, setAppeleFilter] = useState<AppeleFilter>("ALL");

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editRecord, setEditRecord] = useState<PresenceRow | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const importPresence = useImportPresence();
  const toggleAppeleMutation = useToggleAppele();

  const columns = buildColumns(
    (row) => setEditRecord(row),
    canEdit,
    isNurse,
    (id, appele) => toggleAppeleMutation.mutate({ id, appele })
  );

  // ── Statut d'import du jour (SUPERVISOR uniquement) ───────────────────────
  const { data: importStatus } = useFetchTodayImportStatus();

  // ── Employés du superviseur pour le formulaire de saisie manuelle ─────────
  const { data: supervisorEmployees = [] } = useFetchEmployeesForFilters(
    isSupervisor
  );

  // ── Compute per-status counts from the already-loaded data ────────────────
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let pending = 0;
    for (const row of data) {
      const s = computeStatus(row);
      if (s === "PRESENT") present++;
      else if (s === "ABSENT") absent++;
      else pending++;
    }
    return { total: data.length, present, absent, pending };
  }, [data]);

  // ── Client-side filter (statut + appelé, combinés) ───────────────────────
  const filteredData = useMemo<DailyAttendance[]>(() => {
    let result = data;
    if (statusFilter !== "ALL") {
      result = result.filter((row) => computeStatus(row) === statusFilter);
    }
    if (appeleFilter !== "ALL") {
      result = result.filter((row) =>
        appeleFilter === "APPELE" ? row.appele : !row.appele
      );
    }
    return result;
  }, [data, statusFilter, appeleFilter]);

  const hasActiveFilter = statusFilter !== "ALL" || appeleFilter !== "ALL";
  const isEmptyState = hasActiveFilter && filteredData.length === 0;

  // Libellé du pourcentage selon le scope du rôle
  function pct(n: number) {
    if (stats.total === 0) return "0%";
    const p = Math.round((n / stats.total) * 100);
    return isSupervisor ? `${p}% de l'équipe` : `${p}% du total`;
  }

  async function handleImport(formData: { files: File[] }) {
    setIsImporting(true);
    try {
      const file = formData.files[0];

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        throw new Error("Format invalide. Seuls les fichiers .xlsx et .xls sont acceptés.");
      }

      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Limite : 10 Mo.`);
      }
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "buffer" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData: unknown[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: "yyyy-mm-dd",
      });

      validateAttendanceDates(jsonData);
      const records = parseNewAttendanceFormat(jsonData);

      await importPresence.mutateAsync(records);
      setIsImportOpen(false);
    } catch (error) {
      logError("Import présences", error);
      showErrorToast(error, "Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  }

  const filterLabel: Record<PresenceStatus, string> = {
    PRESENT: "Présents uniquement",
    ABSENT: "Absents uniquement",
    PENDING: "En attente uniquement",
  };

  // Compteurs appelé / non appelé (calculés sur les données déjà filtrées par statut)
  const appeleStats = useMemo(() => {
    const base = statusFilter === "ALL"
      ? data
      : data.filter((r) => computeStatus(r) === statusFilter);
    const appele    = base.filter((r) => r.appele).length;
    const nonAppele = base.length - appele;
    return { appele, nonAppele, total: base.length };
  }, [data, statusFilter]);

  // ── Logique d'affichage du bouton de saisie manuelle (SUPERVISOR) ─────────
  const hasXlsxImport = importStatus?.source === "XLSX_IMPORT";
  const hasManualEntry = importStatus?.source === "MANUAL_SUPERVISOR";
  const showManualButton = isSupervisor && !hasXlsxImport;

  // Labels des cartes selon le scope du rôle
  const totalCardLabel = isSupervisor ? "Total équipe" : "Total employés";
  const totalCardSub   = isSupervisor ? "dans mon équipe" : "employés aujourd'hui";

  return (
    <>
      <FileUploadModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Importer le fichier de pointage"
        description="Fichier XLSX du jour courant — colonnes : Matricule, Prénom, Date, Horaire, Début, Fin, Entrée, Sortie, Motif, Département"
        onSubmit={handleImport}
        isLoading={isImporting}
      />

      <EditAttendanceModal
        record={editRecord}
        onClose={() => setEditRecord(null)}
      />

      <ManualPresenceModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        employees={supervisorEmployees}
        existingRecords={hasManualEntry ? data : []}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Heading
          title={`Présences / Absences (${data.length})`}
          description="Présences du jour courant — import, édition et suivi en temps réel."
        />

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton saisie manuelle — SUPERVISOR uniquement, si pas d'import XLSX */}
          {showManualButton && (
            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              className="ds-btn-primary"
            >
              <ClipboardList className="size-4" />
              {hasManualEntry ? "Modifier la saisie" : "Ajouter présences / absences"}
            </button>
          )}

          {/* Bouton import XLSX */}
          {canImport && (
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="ds-btn-primary"
            >
              <Upload className="size-4" />
              Importer le fichier de pointage
            </button>
          )}
        </div>
      </div>

      {/* ── Message informatif SUPERVISOR ────────────────────────────────── */}
      {isSupervisor && hasXlsxImport && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--accent-light)",
            border: "1px solid rgba(47,107,255,0.2)",
            fontSize: 13,
            color: "var(--accent)",
            fontWeight: 500,
          }}
        >
          Pointage du jour déjà importé par l'administrateur.
        </div>
      )}

      {/* ── Stats cards — tous les rôles autorisés ─────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 4,
        }}
        className="presence-stat-grid"
      >
        <StatCard
          label={totalCardLabel}
          value={stats.total}
          sub={totalCardSub}
          accentColor="var(--text2)"
          accentBg="rgba(75,86,117,0.06)"
          isActive={statusFilter === "ALL"}
          filter="ALL"
          onSelect={setStatusFilter}
        />
        <StatCard
          label="Présents aujourd'hui"
          value={stats.present}
          sub={pct(stats.present)}
          accentColor="#00a87a"
          accentBg="rgba(0,168,122,0.07)"
          isActive={statusFilter === "PRESENT"}
          filter="PRESENT"
          onSelect={setStatusFilter}
        />
        <StatCard
          label="Absents aujourd'hui"
          value={stats.absent}
          sub={pct(stats.absent)}
          accentColor="#f03e3e"
          accentBg="rgba(240,62,62,0.07)"
          isActive={statusFilter === "ABSENT"}
          filter="ABSENT"
          onSelect={setStatusFilter}
        />
      </div>

      {/* ── Filtre Appelé / Non appelé — NURSE uniquement ────────────────── */}
      {isNurse && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginRight: 4 }}>
            Appelé :
          </span>
          {(
            [
              { value: "ALL",        label: "Tous",        count: appeleStats.total },
              { value: "APPELE",     label: "● Appelé",    count: appeleStats.appele },
              { value: "NON_APPELE", label: "○ Non appelé",count: appeleStats.nonAppele },
            ] as { value: AppeleFilter; label: string; count: number }[]
          ).map(({ value, label, count }) => {
            const active = appeleFilter === value;
            const isGreen = value === "APPELE";
            const isGray  = value === "NON_APPELE";
            const accentColor = isGreen ? "#1D9E75" : isGray ? "#888780" : "var(--accent)";
            return (
              <button
                key={value}
                onClick={() => setAppeleFilter(active ? "ALL" : value)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: active ? `2px solid ${accentColor}` : "2px solid var(--border)",
                  background: active
                    ? isGreen  ? "rgba(29,158,117,0.08)"
                    : isGray   ? "rgba(136,135,128,0.08)"
                    : "var(--accent-light)"
                    : "var(--white)",
                  color: active ? accentColor : "var(--text2)",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    fontSize: 11,
                    fontWeight: 700,
                    background: active ? accentColor : "var(--border)",
                    color: active ? "#fff" : "var(--text2)",
                    padding: "0 4px",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Separator />

      {/* ── Active filter badge ──────────────────────────────────────────── */}
      {hasActiveFilter && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--accent-light)",
            border: "1px solid rgba(47,107,255,0.2)",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
            {[
              statusFilter !== "ALL" ? filterLabel[statusFilter as PresenceStatus] : null,
              appeleFilter === "APPELE"     ? "Appelés uniquement"     : null,
              appeleFilter === "NON_APPELE" ? "Non appelés uniquement" : null,
            ]
              .filter(Boolean)
              .join(" · ")}{" "}
            —{" "}
            <span style={{ fontWeight: 800 }}>{filteredData.length}</span> affiché
            {filteredData.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => { setStatusFilter("ALL"); setAppeleFilter("ALL"); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--accent)",
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
            }}
            aria-label="Effacer tous les filtres"
          >
            <X size={13} />
            Effacer les filtres
          </button>
        </div>
      )}

      {/* ── Empty state when filter returns 0 rows ───────────────────────── */}
      {isEmptyState && (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 14,
            background: "var(--white)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          Aucun employé ne correspond au filtre.
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {!isEmptyState && (
        <DataTable
          columns={columns}
          data={filteredData}
          globalFilterFn="includesString"
          initialPageSize={50}
        />
      )}
    </>
  );
}
