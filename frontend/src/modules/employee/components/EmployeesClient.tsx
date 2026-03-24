import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  X,
  Download,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import z from "zod";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import axios, { AxiosError } from "axios";
import { useFetchEmployeesStats } from "@/modules/employee/hooks/useFetchEmployeesStats";
import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { DataTable } from "@/components/ui/DataTable";
import { Loader } from "@/components/Loader";
import { columns } from "@/modules/employee/components/columns";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import type {
  EmployeeRequest,
  Employee,
  PageResponse,
  LeftCompanyFilter,
} from "@/modules/employee/types";
import { UploadEmployeeSchema } from "@/modules/employee/schema";
import { useBatchSaveEmployees } from "@/lib/data/employee";
import { useFetchEmployeesPaged } from "@/modules/employee/hooks/useFetchEmployeesPaged";
import { useFetchEmployeesForFilters } from "@/modules/employee/hooks/useFetchEmployeesForFilters";
import { formatEmployee, parseEmployee } from "../utils";
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
      errors: Array.isArray(data?.errors) ? data.errors : [],
      raw: err,
    };
  }

  if (err instanceof Error) {
    return {
      status: undefined,
      code: undefined,
      message: err.message,
      errors: [],
      raw: err,
    };
  }

  return {
    status: undefined,
    code: undefined,
    message: "Une erreur inattendue est survenue",
    errors: [],
    raw: err,
  };
}

export function EmployeesClient() {
  const { auth } = useAuth();
  const { data: stats } = useFetchEmployeesStats();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const batchSaveEmployees = useBatchSaveEmployees();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filtres avancés
  const [filterProductionLine, setFilterProductionLine] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterEmploymentType, setFilterEmploymentType] = useState("");
  const [filterHireDateFrom, setFilterHireDateFrom] = useState("");
  const [filterHireDateTo, setFilterHireDateTo] = useState("");

  // ✅ nouveau filtre principal
  const [leftCompanyFilter, setLeftCompanyFilter] =
      useState<LeftCompanyFilter>("ALL");

  const hasActiveFilters = !!(
      filterProductionLine ||
      filterShift ||
      filterEmploymentType ||
      filterHireDateFrom ||
      filterHireDateTo ||
      leftCompanyFilter !== "ALL"
  );

  function resetFilters() {
    setFilterProductionLine("");
    setFilterShift("");
    setFilterEmploymentType("");
    setFilterHireDateFrom("");
    setFilterHireDateTo("");
    setLeftCompanyFilter("ALL");
    setPage(0);
  }

  const { data: allEmployeesForFilters = [] } = useFetchEmployeesForFilters();

  const productionLineOptions = [
    ...new Set(
        allEmployeesForFilters.map((e) => e.productionLine?.name).filter(Boolean)
    ),
  ] as string[];

  const shiftOptions = [
    ...new Set(allEmployeesForFilters.map((e) => e.shift?.name).filter(Boolean)),
  ] as string[];

  const employmentTypeOptions = [
    ...new Set(
        allEmployeesForFilters.map((e) => e.employmentType?.type).filter(Boolean)
    ),
  ] as string[];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const filters = {
    productionLine: filterProductionLine || undefined,
    shift: filterShift || undefined,
    employmentType: filterEmploymentType || undefined,
    hireDateFrom: filterHireDateFrom || undefined,
    hireDateTo: filterHireDateTo || undefined,
    leftCompanyFilter,
  };

  const { data: pageData, isLoading, isFetching } = useFetchEmployeesPaged(
      page,
      PAGE_SIZE,
      search,
      filters
  );

  const formattedEmployees = (pageData?.content ?? []).map(formatEmployee);
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const isFirst = pageData?.first ?? true;
  const isLast = pageData?.last ?? true;

  async function handleExportExcel() {
    try {
      const { data } = await axios.get<PageResponse<Employee>>(
          "/employees/pagination",
          {
            baseURL: API_BASE_URL,
            headers: { Authorization: `Bearer ${auth.accessToken}` },
            params: {
              page: 0,
              size: totalElements || 10000,
              ...(search.trim() ? { search: search.trim() } : {}),
              ...filters,
            },
          }
      );

      const all = (data.content ?? []).map(formatEmployee);

      const HEADER_LABELS: Record<string, string> = {
        matricule: "MATRICULE",
        civility: "CIVILITÉ",
        fullName: "NOM ET PRÉNOM",
        department: "DÉPARTEMENT",
        jobTitle: "POSTE OCCUPÉ",
        productionLine: "LIGNE DE PRODUCTION",
        shift: "POSTE",
        employmentType: "TYPE DE TRAVAIL",
        hireDate: "DATE D'EMBAUCHE",
        hasLeftCompanyLabel: "STATUT EMPLOYÉ",
        departureDate: "DATE DE DÉPART",
        supervisor: "SUPERVISEUR",
        hasBankDomiciliation: "DOMICILIÉ",
        email: "EMAIL",
        attendance: "PRÉSENCE",
      };

      if (all.length === 0) {
        toast.error("Aucun employé à exporter");
        return;
      }

      const keys = Object.keys(all[0]);
      const renamedData = all.map((row) => {
        const newRow: Record<string, unknown> = {};
        keys.forEach((k) => {
          newRow[HEADER_LABELS[k] ?? k.toUpperCase()] =
              (row as Record<string, unknown>)[k];
        });
        return newRow;
      });

      const ws = XLSX.utils.json_to_sheet(renamedData);

      const COL_WIDTHS: Record<string, number> = {
        MATRicule: 12,
        "MATRICULE": 12,
        "CIVILITÉ": 12,
        "NOM ET PRÉNOM": 28,
        "DÉPARTEMENT": 20,
        "POSTE OCCUPÉ": 28,
        "LIGNE DE PRODUCTION": 22,
        "POSTE": 10,
        "TYPE DE TRAVAIL": 18,
        "DATE D'EMBAUCHE": 18,
        "STATUT EMPLOYÉ": 18,
        "DATE DE DÉPART": 18,
        "SUPERVISEUR": 28,
        "DOMICILIÉ": 12,
        "EMAIL": 28,
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
      const workbook = XLSX.read(arrayBuffer, {
        type: "buffer",
        cellDates: true,
        dateNF: "dd/mm/yyyy",
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const employees: EmployeeRequest[] = jsonData.map((row, index) =>
          parseEmployee(row, index)
      );

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
              <div className="font-semibold">
                {e.message} {e.code ? `(code: ${e.code})` : ""}
              </div>
              <ul className="mt-2 list-disc pl-5">
                {e.errors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>,
            { duration: 10000 }
        );
      } else {
        toast.error(`${e.message}${e.status ? ` (HTTP ${e.status})` : ""}`, {
          duration: 7000,
        });
      }
    } finally {
      setIsUploadLoading(false);
    }
  }

  if (isLoading) return <Loader />;

  const cardClass = (active: boolean) =>
      `rounded-2xl border bg-white p-5 shadow-sm transition cursor-pointer ${
          active
              ? "border-slate-900 ring-2 ring-slate-900"
              : "border-slate-200 hover:border-slate-400"
      }`;

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

        {/* ✅ cards filtres */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
              className={cardClass(leftCompanyFilter === "ALL")}
              onClick={() => {
                setLeftCompanyFilter("ALL");
                setPage(0);
              }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total employés
                </p>
                <h3 className="mt-4 text-3xl font-bold text-slate-900">
                  {stats?.totalEmployees ?? 0}
                </h3>
              </div>
              <div className="rounded-full bg-slate-100 p-3">
                <Users className="size-5 text-slate-700" />
              </div>
            </div>
          </div>

          <div
              className={cardClass(leftCompanyFilter === "CURRENT")}
              onClick={() => {
                setLeftCompanyFilter("CURRENT");
                setPage(0);
              }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Employés actuels
                </p>
                <h3 className="mt-4 text-3xl font-bold text-emerald-600">
                  {stats?.currentEmployees ?? 0}
                </h3>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <UserCheck className="size-5 text-emerald-700" />
              </div>
            </div>
          </div>

          <div
              className={cardClass(leftCompanyFilter === "FORMER")}
              onClick={() => {
                setLeftCompanyFilter("FORMER");
                setPage(0);
              }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Anciens employés
                </p>
                <h3 className="mt-4 text-3xl font-bold text-red-500">
                  {stats?.formerEmployees ?? 0}
                </h3>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <UserX className="size-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* recherche */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--muted)" }}
            />
            <input
                type="text"
                placeholder="Rechercher (nom, matricule)…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 w-full rounded-lg border pl-9 pr-8 text-sm outline-none transition-[border-color,box-shadow]"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(47,107,255,0.10)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
            />

            {searchInput && (
                <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 top-1/2 rounded p-0.5 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--muted)" }}
                >
                  <X className="size-3.5" />
                </button>
            )}
          </div>

          {isFetching && !isLoading && (
              <span className="shrink-0 text-xs" style={{ color: "var(--muted)" }}>
            Chargement…
          </span>
          )}
        </div>

        {/* filtres */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
                className="text-xs font-medium"
                style={{ color: "var(--text2)" }}
            >
              Ligne de Production
            </label>
            <select
                value={filterProductionLine}
                onChange={(e) => {
                  setFilterProductionLine(e.target.value);
                  setPage(0);
                }}
                className="h-9 rounded-lg border px-2 text-sm outline-none transition-[border-color,box-shadow]"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  minWidth: 160,
                }}
            >
              <option value="">Toutes</option>
              {productionLineOptions.map((pl) => (
                  <option key={pl} value={pl}>
                    {pl}
                  </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
                className="text-xs font-medium"
                style={{ color: "var(--text2)" }}
            >
              Poste
            </label>
            <select
                value={filterShift}
                onChange={(e) => {
                  setFilterShift(e.target.value);
                  setPage(0);
                }}
                className="h-9 rounded-lg border px-2 text-sm outline-none transition-[border-color,box-shadow]"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  minWidth: 130,
                }}
            >
              <option value="">Tous</option>
              {shiftOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
                className="text-xs font-medium"
                style={{ color: "var(--text2)" }}
            >
              Type de Travail
            </label>
            <select
                value={filterEmploymentType}
                onChange={(e) => {
                  setFilterEmploymentType(e.target.value);
                  setPage(0);
                }}
                className="h-9 rounded-lg border px-2 text-sm outline-none transition-[border-color,box-shadow]"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  minWidth: 150,
                }}
            >
              <option value="">Tous</option>
              {employmentTypeOptions.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
                className="text-xs font-medium"
                style={{ color: "var(--text2)" }}
            >
              Embauche — début
            </label>
            <input
                type="date"
                value={filterHireDateFrom}
                onChange={(e) => {
                  setFilterHireDateFrom(e.target.value);
                  setPage(0);
                }}
                className="h-9 rounded-lg border px-2 text-sm outline-none transition-[border-color,box-shadow]"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  minWidth: 150,
                }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
                className="text-xs font-medium"
                style={{ color: "var(--text2)" }}
            >
              Embauche — fin
            </label>
            <input
                type="date"
                value={filterHireDateTo}
                onChange={(e) => {
                  setFilterHireDateTo(e.target.value);
                  setPage(0);
                }}
                className="h-9 rounded-lg border px-2 text-sm outline-none transition-[border-color,box-shadow]"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  minWidth: 150,
                }}
            />
          </div>

          {hasActiveFilters && (
              <button
                  type="button"
                  onClick={resetFilters}
                  className="flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--accent4)",
                  }}
              >
                <X className="size-3.5" />
                Réinitialiser
              </button>
          )}
        </div>

        <div className="mt-5">
          <DataTable
              columns={columns}
              data={formattedEmployees}
              initialPageSize={PAGE_SIZE}
              hidePagination
          />
        </div>

        <div className="flex items-center justify-between px-1 pt-4">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {totalElements === 0
                ? "Aucun résultat"
                : `Page ${page + 1} sur ${totalPages} — ${totalElements} employé${
                    totalElements !== 1 ? "s" : ""
                }`}
          </p>

          <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={isFirst || isFetching}
                title="Page précédente"
                className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text2)",
                }}
            >
              <ChevronLeft className="size-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => Math.abs(i - page) <= 2)
                .map((i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => setPage(i)}
                        disabled={isFetching}
                        className="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium transition-colors disabled:opacity-40"
                        style={{
                          background: i === page ? "var(--accent)" : "var(--surface2)",
                          border: `1px solid ${
                              i === page ? "var(--accent)" : "var(--border)"
                          }`,
                          color: i === page ? "#fff" : "var(--text2)",
                        }}
                    >
                      {i + 1}
                    </button>
                ))}

            <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={isLast || isFetching}
                title="Page suivante"
                className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text2)",
                }}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </>
  );
}