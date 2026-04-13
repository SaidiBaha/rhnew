import { useState, useMemo, useCallback } from "react";
import { Upload, X } from "lucide-react";
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
import { buildColumns } from "./columns";
import { EditAttendanceModal } from "./EditAttendanceModal";
import { computeStatus } from "../utils/status";
import type { DailyAttendance, PresenceStatus } from "../types";
import type { PresenceRow } from "./columns";
import useAuth from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | PresenceStatus;

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editRecord, setEditRecord] = useState<PresenceRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const importPresence = useImportPresence();

  const isSupervisor = auth.user?.role === "SUPERVISOR";

  const canImport = auth.user?.role
    ? (["ADMIN", "SUPER_ADMIN", "SUPERVISOR"] as string[]).includes(auth.user.role)
    : false;

  const canEdit = auth.user?.role
    ? (["ADMIN", "SUPER_ADMIN", "SUPERVISOR"] as string[]).includes(auth.user.role)
    : false;

  const columns = buildColumns((row) => setEditRecord(row), canEdit);

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

  // ── Client-side filter ────────────────────────────────────────────────────
  const filteredData = useMemo<DailyAttendance[]>(() => {
    if (statusFilter === "ALL") return data;
    return data.filter((row) => computeStatus(row) === statusFilter);
  }, [data, statusFilter]);

  const hasActiveFilter = statusFilter !== "ALL";
  const isEmptyState = hasActiveFilter && filteredData.length === 0;

  function pct(n: number) {
    if (stats.total === 0) return "0% de l'équipe";
    return `${Math.round((n / stats.total) * 100)}% de l'équipe`;
  }

  async function handleImport(formData: { files: File[] }) {
    setIsImporting(true);
    try {
      const file = formData.files[0];

      // Validation type
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        throw new Error("Format invalide. Seuls les fichiers .xlsx et .xls sont acceptés.");
      }

      // Validation taille (10 Mo)
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

      // Validation des dates (règle : 4 premières + 4 dernières uniques = aujourd'hui)
      validateAttendanceDates(jsonData);

      // Parse + regroupement (2 shifts → 1 enregistrement)
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

      <div className="flex items-center justify-between">
        <Heading
          title={`Présences / Absences (${data.length})`}
          description="Présences du jour courant — import, édition et suivi en temps réel."
        />

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

      {/* ── Stats cards — SUPERVISOR only ─────────────────────────────────── */}
      {isSupervisor && (
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
            label="Total équipe"
            value={stats.total}
            sub="dans mon équipe"
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
      )}

      <Separator />

      {/* ── Active filter badge ──────────────────────────────────────────── */}
      {isSupervisor && hasActiveFilter && (
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
            {filterLabel[statusFilter as PresenceStatus]} —{" "}
            <span style={{ fontWeight: 800 }}>{filteredData.length}</span> affiché
            {filteredData.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setStatusFilter("ALL")}
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
            aria-label="Effacer le filtre"
          >
            <X size={13} />
            Effacer le filtre
          </button>
        </div>
      )}

      {/* ── Empty state when filter returns 0 rows ───────────────────────── */}
      {isSupervisor && isEmptyState && (
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
