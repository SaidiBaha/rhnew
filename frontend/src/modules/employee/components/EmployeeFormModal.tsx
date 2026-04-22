import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Civilities, type Employee } from "@/modules/employee/types";
import { useCreateEmployee } from "@/modules/employee/hooks/useCreateEmployee";
import { useUpdateEmployee } from "@/modules/employee/hooks/useUpdateEmployee";
import { useFetchSupervisors } from "@/modules/employee/hooks/useFetchSupervisors";
import { useFetchJobTitles } from "@/modules/employee/hooks/useFetchJobTitles";
import { useFetchDepartments } from "@/modules/employee/hooks/useFetchDepartments";
import { useFetchProductionLines } from "@/modules/permutation/hooks/useFetchProductionLines";

// ─── Constantes fixes ─────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = ["CADRE", "INDIRECTS", "DIRECTS"] as const;
const SHIFTS = ["A", "B"] as const;

// ─── Schema ──────────────────────────────────────────────────────────────────

const EmployeeFormSchema = z.object({
  matricule: z
    .string()
    .trim()
    .min(1, "Obligatoire")
    .regex(/^\d+$/, "Chiffres uniquement"),
  civility: z.enum(Civilities, { message: "Sélectionner une civilité" }),
  fullName: z.string().trim().min(1, "Obligatoire"),
  department: z.string().trim().min(1, "Obligatoire"),
  jobTitle: z.string().trim().min(1, "Obligatoire"),
  productionLine: z.string().trim().optional(),
  shift: z.string().trim().optional(),
  employmentType: z.string().trim().min(1, "Obligatoire"),
  hireDate: z.string().min(1, "Date obligatoire"),
  supervisor: z
    .string()
    .trim()
    .regex(/^\d+$/, "Chiffres uniquement")
    .optional()
    .or(z.literal("")),
  hasBankDomiciliation: z.boolean().default(false),
  free: z.boolean().default(false),
  email: z
    .string()
    .trim()
    .email("Email invalide")
    .optional()
    .or(z.literal("")),
  hasLeftCompany: z.boolean().nullable().optional().default(null),
  departureDate: z.string().optional(),
  supervisorRole: z.boolean().default(false),
});

type EmployeeFormValues = z.infer<typeof EmployeeFormSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeIsoDate(value?: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function toUpperTrim(v?: string | null) {
  return v ? v.trim().toUpperCase() : "";
}

type BackendError = { code?: string | number; message?: string; errors?: string[] };

function extractError(err: unknown): { message: string; errors: string[] } {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<BackendError>).response?.data;
    return {
      message: data?.message ?? err.message ?? "Erreur API",
      errors: Array.isArray(data?.errors) ? data.errors : [],
    };
  }
  if (err instanceof Error) return { message: err.message, errors: [] };
  return { message: "Erreur inattendue", errors: [] };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 flex items-center gap-3 pt-2">
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--accent)" }}
      >
        {children}
      </span>
      <div className="flex-1 border-t" style={{ borderColor: "var(--border)" }} />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EmployeeFormModal({
  isOpen,
  onClose,
  employee,
}: EmployeeFormModalProps) {
  const isEditMode = !!employee;
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { data: supervisors = [] } = useFetchSupervisors();
  const { data: jobTitles = [] } = useFetchJobTitles();
  const { data: departments = [] } = useFetchDepartments();
  const { data: productionLines = [] } = useFetchProductionLines();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(EmployeeFormSchema),
    defaultValues: {
      matricule: "",
      civility: "MONSIEUR",
      fullName: "",
      department: "",
      jobTitle: "",
      productionLine: "",
      shift: "",
      employmentType: "",
      hireDate: "",
      supervisor: "",
      hasBankDomiciliation: false,
      free: false,
      email: "",
      hasLeftCompany: null,
      departureDate: "",
      supervisorRole: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        form.reset({
          matricule: employee.matricule,
          civility: employee.civility,
          fullName: employee.fullName,
          department: employee.department?.name ?? "",
          jobTitle: employee.jobTitle?.title ?? "",
          productionLine: employee.productionLine?.name ?? "",
          shift: employee.shift?.name ?? "",
          employmentType: employee.employmentType?.type ?? "",
          hireDate: safeIsoDate(employee.hireDate),
          supervisor: employee.supervisor?.matricule ?? "",
          hasBankDomiciliation: employee.hasBankDomiciliation ?? false,
          free: employee.free ?? false,
          email: employee.email ?? "",
          hasLeftCompany: employee.hasLeftCompany ?? null,
          departureDate: safeIsoDate(employee.departureDate),
          supervisorRole: employee.supervisorRole ?? false,
        });
      } else {
        form.reset({
          matricule: "",
          civility: "MONSIEUR",
          fullName: "",
          department: "",
          jobTitle: "",
          productionLine: "",
          shift: "",
          employmentType: "",
          hireDate: "",
          supervisor: "",
          hasBankDomiciliation: false,
          free: false,
          email: "",
          hasLeftCompany: null,
          departureDate: "",
          supervisorRole: false,
        });
      }
    }
  }, [isOpen, employee, form]);

  async function onSubmit(values: EmployeeFormValues) {
    const request = {
      matricule: values.matricule,
      civility: values.civility,
      fullName: toUpperTrim(values.fullName),
      department: toUpperTrim(values.department),
      jobTitle: toUpperTrim(values.jobTitle),
      productionLine: values.productionLine ? toUpperTrim(values.productionLine) : undefined,
      shift: values.shift ? toUpperTrim(values.shift) : undefined,
      employmentType: toUpperTrim(values.employmentType),
      hireDate: values.hireDate,
      supervisor: values.supervisor || undefined,
      hasBankDomiciliation: values.hasBankDomiciliation,
      free: values.free,
      email: values.email || undefined,
      hasLeftCompany: values.hasLeftCompany ?? null,
      departureDate: values.departureDate || null,
      supervisorRole: values.supervisorRole,
    };

    try {
      if (isEditMode) {
        await updateEmployee.mutateAsync({ id: employee!.id, data: request });
        toast.success("Employé modifié avec succès ✅");
      } else {
        await createEmployee.mutateAsync(request);
        toast.success("Employé créé avec succès ✅");
      }
      onClose();
    } catch (err) {
      const { message, errors } = extractError(err);
      if (errors.length > 0) {
        toast.error(
          <div>
            <div className="font-semibold">{message}</div>
            <ul className="mt-2 list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error(message, { duration: 6000 });
      }
    }
  }

  const isLoading = createEmployee.isPending || updateEmployee.isPending;

  const inputClass =
    "h-9 w-full rounded-lg border px-3 text-sm outline-none transition-[border-color,box-shadow] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20 focus:border-[var(--accent)]";
  const inputStyle = {
    background: "var(--white)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: 720, borderColor: "var(--accent)", borderWidth: 2 }}
      >
        <DialogHeader className="pb-1">
          <DialogTitle style={{ color: "var(--text)", fontSize: "1.1rem" }}>
            {isEditMode ? "Modifier l'employé" : "Nouvel employé"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--text2)", fontSize: "0.85rem" }}>
            {isEditMode
              ? "Modifiez les informations de l'employé."
              : "Remplissez les informations du nouvel employé."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="pt-1">
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">

              {/* ── Section : Identité ─────────────────────────────────── */}
              <SectionTitle>Identité</SectionTitle>

              {/* Matricule */}
              <FormField
                control={form.control}
                name="matricule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                      Matricule <span style={{ color: "var(--accent4)" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <input {...field} className={inputClass} style={inputStyle} placeholder="Ex: 12345" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Civilité */}
              <FormField
                control={form.control}
                name="civility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                      Civilité <span style={{ color: "var(--accent4)" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <select {...field} className={inputClass} style={inputStyle}>
                        {Civilities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nom et Prénom */}
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                        Nom et Prénom <span style={{ color: "var(--accent4)" }}>*</span>
                      </FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          className={inputClass}
                          style={inputStyle}
                          placeholder="Ex: BEN ALI MOHAMED"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email */}
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>Email</FormLabel>
                      <FormControl>
                        <input
                          type="email"
                          {...field}
                          className={inputClass}
                          style={inputStyle}
                          placeholder="exemple@email.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Section : Rattachement ─────────────────────────────── */}
              <SectionTitle>Rattachement professionnel</SectionTitle>

              {/* Département */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                      Département <span style={{ color: "var(--accent4)" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <select {...field} className={inputClass} style={inputStyle}>
                        <option value="">— Aucun —</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Poste Occupé */}
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                      Poste Occupé <span style={{ color: "var(--accent4)" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <select {...field} className={inputClass} style={inputStyle}>
                        <option value="">— Sélectionner —</option>
                        {jobTitles.map((jt) => (
                          <option key={jt.id} value={jt.title}>
                            {jt.title}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type de Travail */}
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                      Type de Travail <span style={{ color: "var(--accent4)" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <select {...field} className={inputClass} style={inputStyle}>
                        <option value="">— Sélectionner —</option>
                        {EMPLOYMENT_TYPES.map((et) => (
                          <option key={et} value={et}>{et}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ligne de Production */}
              <FormField
                control={form.control}
                name="productionLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>Ligne de Production</FormLabel>
                    <FormControl>
                      <select {...field} className={inputClass} style={inputStyle}>
                        <option value="">— Aucune —</option>
                        {productionLines.map((pl) => (
                          <option key={pl.id} value={pl.name ?? pl.label ?? ""}>
                            {pl.name ?? pl.label ?? ""}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Poste (Shift) */}
              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>Poste (Shift)</FormLabel>
                    <FormControl>
                      <select {...field} className={inputClass} style={inputStyle}>
                        <option value="">— Aucun —</option>
                        {SHIFTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Section : Contrat ──────────────────────────────────── */}
              <SectionTitle>Contrat</SectionTitle>

              {/* Date d'Embauche */}
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                      Date d'Embauche <span style={{ color: "var(--accent4)" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <input type="date" {...field} className={inputClass} style={inputStyle} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Superviseur */}
              <FormField
                control={form.control}
                name="supervisor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>Superviseur</FormLabel>
                    <FormControl>
                      <select {...field} className={inputClass} style={inputStyle}>
                        <option value="">— Aucun —</option>
                        {supervisors.map((s) => (
                          <option key={s.matricule} value={s.matricule}>
                            {s.fullName} ({s.matricule})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Section : Options ──────────────────────────────────── */}
              <SectionTitle>Options</SectionTitle>

              {/* Domiciliation Bancaire */}
              <FormField
                control={form.control}
                name="hasBankDomiciliation"
                render={({ field }) => (
                  <FormItem
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded accent-[var(--accent)]"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer text-sm" style={{ color: "var(--text2)" }}>
                      Domiciliation Bancaire
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* A quitté la société */}
              <FormField
                control={form.control}
                name="hasLeftCompany"
                render={({ field }) => (
                  <FormItem
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value === true}
                        onChange={(e) => field.onChange(e.target.checked ? true : null)}
                        className="h-4 w-4 rounded accent-[var(--accent)]"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer text-sm" style={{ color: "var(--text2)" }}>
                      A quitté la société
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Est superviseur */}
              <FormField
                control={form.control}
                name="supervisorRole"
                render={({ field }) => (
                  <FormItem
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded accent-[var(--accent)]"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer text-sm" style={{ color: "var(--text2)" }}>
                      Est superviseur
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date de Départ (conditionnelle) */}
              {form.watch("hasLeftCompany") === true && (
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="departureDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: "var(--text2)", fontSize: "0.8rem" }}>Date de Départ</FormLabel>
                        <FormControl>
                          <input type="date" {...field} className={inputClass} style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div
              className="mt-6 flex justify-end gap-3 border-t pt-4"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="h-9 rounded-lg border px-5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--border)",
                  color: "var(--text2)",
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="h-9 rounded-lg px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                {isLoading
                  ? isEditMode ? "Enregistrement…" : "Création…"
                  : isEditMode ? "Enregistrer" : "Créer l'employé"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
