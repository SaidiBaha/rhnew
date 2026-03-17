import { useState, useEffect, useRef } from "react";
import { Search, Upload, X, Download } from "lucide-react";
import z from "zod";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import axios, { AxiosError } from "axios";
import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { DataTable } from "@/components/ui/DataTable";
import { Loader } from "@/components/Loader";
import { columns } from "@/modules/employee/components/columns";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import type { EmployeeRequest } from "@/modules/employee/types";
import { UploadEmployeeSchema } from "@/modules/employee/schema";
import { useBatchSaveEmployees } from "@/lib/data/employee";
import { useFetchEmployeesPaged } from "@/modules/employee/hooks/useFetchEmployeesPaged";
import { formatEmployee, parseEmployee } from "../utils";

import type { Employee, PageResponse } from "@/modules/employee/types";
import useAuth from "@/hooks/useAuth";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PAGE_SIZE = 25;

type BackendErrorDto = {
  code?: string | number;
  httpCode?: number;
  message?: string;
  errors?: string[];
};

function extractAxiosError(err: unknown): {
  status?: number;
  code?: string | number;
  message: string;
  errors: string[];
  raw: unknown;
} {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<BackendErrorDto>;
    const status = axErr.response?.status;
    const data = axErr.response?.data;
    return {
      status,
      code: data?.code,
      message: data?.message ?? axErr.message ?? "Erreur API",
      errors: Array.isArray(data?.errors) ? data!.errors! : [],
      raw: err,
    };
  }
  if (err instanceof Error) {
    return { status: undefined, code: undefined, message: err.message, errors: [], raw: err };
  }
  return { status: undefined, code: undefined, message: "Une erreur inattendue est survenue", errors: [], raw: err };
}

export function EmployeesClient() {
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const batchSaveEmployees = useBatchSaveEmployees();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce 400ms : reset page to 0 à chaque nouvelle recherche
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const { data: pageData, isLoading, isFetching } = useFetchEmployeesPaged(page, PAGE_SIZE, search);

  const formattedEmployees = (pageData?.content ?? []).map(formatEmployee);
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages    = pageData?.totalPages ?? 1;
  const isFirst       = pageData?.first ?? true;
  const isLast        = pageData?.last ?? true;

  const { auth } = useAuth();

  // ── Export Excel (tous les employés) ──
  async function handleExportExcel() {
    try {
      const { data } = await axios.get<PageResponse<Employee>>("/employees/pagination", {
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        params: { page: 0, size: totalElements || 10000, ...(search.trim() ? { search: search.trim() } : {}) },
      });

      const all = (data.content ?? []).map(formatEmployee);

      const HEADER_LABELS: Record<string, string> = {
        matricule:            "MATRICULE",
        civility:             "CIVILITÉ",
        fullName:             "NOM ET PRÉNOM",
        department:           "DÉPARTEMENT",
        jobTitle:             "POSTE OCCUPÉ",
        productionLine:       "LIGNE DE PRODUCTION",
        shift:                "POSTE",
        employmentType:       "TYPE DE TRAVAIL",
        hireDate:             "DATE D'EMBAUCHE",
        supervisor:           "SUPERVISEUR",
        hasBankDomiciliation: "DOMICILIÉ",
        attendance:           "PRÉSENCE",
      };

      if (all.length === 0) {
        toast.error("Aucun employé à exporter");
        return;
      }

      const keys = Object.keys(all[0]);
      const renamedData = all.map((row) => {
        const newRow: Record<string, unknown> = {};
        keys.forEach((k) => {
          newRow[HEADER_LABELS[k] ?? k.toUpperCase()] = (row as Record<string, unknown>)[k];
        });
        return newRow;
      });

      const ws = XLSX.utils.json_to_sheet(renamedData);

      const COL_WIDTHS: Record<string, number> = {
        "MATRICULE": 12,
        "CIVILITÉ": 12,
        "NOM ET PRÉNOM": 28,
        "DÉPARTEMENT": 20,
        "POSTE OCCUPÉ": 28,
        "LIGNE DE PRODUCTION": 22,
        "POSTE": 10,
        "TYPE DE TRAVAIL": 18,
        "DATE D'EMBAUCHE": 18,
        "SUPERVISEUR": 28,
        "DOMICILIÉ": 12,
        "PRÉSENCE": 12,
      };

      ws["!cols"] = keys.map((k) => {
        const label = HEADER_LABELS[k] ?? k.toUpperCase();
        return { wch: COL_WIDTHS[label] ?? 16 };
      });

      ws["!freeze"] = { xSplit: 0, ySplit: 1 };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employés");
      XLSX.writeFile(wb, "employes.xlsx");
      toast.success(`${all.length} employés exportés ✅`);
    } catch (error) {
      const e = extractAxiosError(error);
      toast.error(`Erreur export: ${e.message}`, { duration: 5000 });
    }
  }

  async function onSubmit(formData: z.infer<typeof UploadEmployeeSchema>) {
    setIsUploadLoading(true);
    try {
      const file = formData.files[0];
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "buffer", cellDates: true, dateNF: "dd/mm/yyyy" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const employees: EmployeeRequest[] = jsonData.map((row, index) => parseEmployee(row, index));
      await batchSaveEmployees.mutateAsync(employees);
      toast.success("Import effectué avec succès ✅", { duration: 4000 });
      setIsFileUploadOpen(false);
      setPage(0);
    } catch (error) {
      const e = extractAxiosError(error);
      console.group("❌ Employees batch import failed");
      console.error("HTTP:", e.status);
      console.error("Code:", e.code);
      console.error("Message:", e.message);
      if (e.errors?.length) console.error("Errors:", e.errors);
      console.error("Raw:", e.raw);
      console.groupEnd();
      if (e.errors.length) {
        toast.error(
          <div>
            <div className="font-semibold">{e.message} {e.code ? `(code: ${e.code})` : ""}</div>
            <ul className="mt-2 list-disc pl-5">
              {e.errors.map((msg, idx) => <li key={idx}>{msg}</li>)}
            </ul>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error(`${e.message}${e.status ? ` (HTTP ${e.status})` : ""}`, { duration: 7000 });
      }
    } finally {
      setIsUploadLoading(false);
    }
  }

  if (isLoading) return <Loader />;

  return (
    <>
      <FileUploadModal
        isOpen={isFileUploadOpen}
        onClose={() => setIsFileUploadOpen(false)}
        title="Importer"
        description="Importer l'effectif des employés"
        onSubmit={onSubmit}
        isLoading={isUploadLoading}
      />

      <div className="flex items-center justify-between">
        <Heading
          title={`Employés (${totalElements})`}
          description="Gérer les employés."
        />
        <div className="flex items-center gap-x-4">
          <button
            type="button"
            onClick={handleExportExcel}
            className="ds-btn-primary"
          >
            <Download className="size-4" />
            Exporter Excel
          </button>
          <button
            type="button"
            onClick={() => setIsFileUploadOpen(true)}
            className="ds-btn-primary"
          >
            <Upload className="size-4" />
            Importer
          </button>
        </div>
      </div>

      <Separator />

      {/* ── Barre de recherche serveur ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted)" }} />
          <input
            type="text"
            placeholder="Rechercher (nom, matricule)…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-8 h-9 w-full rounded-lg border text-sm outline-none transition-[border-color,box-shadow]"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,107,255,0.10)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--border)";  e.currentTarget.style.boxShadow = "none"; }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors"
              style={{ color: "var(--muted)" }}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {isFetching && !isLoading && (
          <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>Chargement…</span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={formattedEmployees}
        initialPageSize={PAGE_SIZE}
        serverPagination={{
          page,
          totalPages,
          totalElements,
          isFetching,
          isFirst,
          isLast,
          onPageChange: setPage,
        }}
      />
    </>
  );
}