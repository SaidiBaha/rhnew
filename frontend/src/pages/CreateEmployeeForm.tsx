// src/pages/CreateEmployeeForm.tsx
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Swal from "sweetalert2";
import {
  User, Briefcase, FileText,
  Loader2, Sparkles, AlertCircle, Calendar, CheckCircle2,
} from "lucide-react";
import { EmployeeSchema } from "@/modules/employee/schema";
import { useCreateEmployee } from "@/lib/data/employee";
import { DEPARTMENTS, JOB_TITLES, PRODUCTION_LINES, EMPLOYMENT_TYPES } from "@/modules/employee/constants";
import type { EmployeeRequest } from "@/modules/employee/types";

type FormData = z.input<typeof EmployeeSchema>;

function SelectField({
  label, required, error, disabled, value, onChange, options, placeholder,
}: {
  label: string; required?: boolean; error?: string; disabled?: boolean;
  value: string; onChange: (v: string) => void;
  options: readonly string[]; placeholder?: string;
}) {
  const cls = [
    "w-full px-3.5 py-2.5 rounded-xl border-2 text-sm font-medium outline-none transition-all duration-200 cursor-pointer appearance-none bg-no-repeat",
    "focus:ring-4 focus:bg-white",
    error
      ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
      : "border-[#dde0ce] bg-[#f8f9f4] hover:border-[#6b7c3a] focus:border-[#6b7c3a] focus:ring-[#6b7c3a]/10",
    disabled ? "opacity-40 cursor-not-allowed" : "",
    !value ? "text-[#a0a88c]" : "text-[#2a2e18]",
  ].join(" ");

  return (
    <div>
      <label className="block text-xs font-bold text-[#4e5c28] uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={cls}
          style={{ paddingRight: 36, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238a9060' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundPosition: "right 12px center", backgroundSize: 14 }}
        >
          <option value="">{placeholder || "Sélectionner…"}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {error && <p className="flex items-center gap-1 mt-1 text-xs text-rose-500"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

function TextInput({ label, error, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#4e5c28] uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <input
        {...props}
        className={[
          "w-full px-3.5 py-2.5 rounded-xl border-2 text-sm font-medium outline-none transition-all duration-200",
          "placeholder:text-[#c0c8a0] focus:ring-4 focus:bg-white",
          error
            ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
            : "border-[#dde0ce] bg-[#f8f9f4] hover:border-[#6b7c3a] focus:border-[#6b7c3a] focus:ring-[#6b7c3a]/10",
          props.disabled ? "opacity-40 cursor-not-allowed" : "",
        ].join(" ")}
      />
      {error && <p className="flex items-center gap-1 mt-1 text-xs text-rose-500"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e0e3ce] shadow-sm flex flex-col">
      <div className="px-5 py-3.5 flex items-center gap-3 bg-gradient-to-r from-[#4e5c28] to-[#6b7c3a] rounded-t-2xl flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
          <p className="text-xs text-white/60">{subtitle}</p>
        </div>
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

function ShiftCard({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#4e5c28] uppercase tracking-wider mb-1.5">
        Poste (Shift) <span className="text-[#a0a88c] font-normal normal-case tracking-normal text-[11px]">(optionnel)</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {["A", "B"].map(opt => {
          const active = value === opt;
          return (
            <button key={opt} type="button" disabled={disabled}
              onClick={() => onChange(active ? "" : opt)}
              className={[
                "py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center gap-2 select-none",
                active ? "bg-[#4e5c28] border-[#4e5c28] text-white shadow-md shadow-[#4e5c28]/20"
                       : "bg-[#f8f9f4] border-[#dde0ce] text-[#6b7c3a] hover:border-[#6b7c3a] hover:bg-[#f0f2e8]",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              <span className={["w-5 h-5 rounded-md flex items-center justify-center text-xs font-black flex-shrink-0",
                active ? "bg-white/20 text-white" : "bg-[#e8ebdc] text-[#4e5c28]"].join(" ")}>{opt}</span>
              Poste {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BankToggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => !disabled && onChange(!value)}
      className={["w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left",
        value ? "bg-[#f0f2e8] border-[#4e5c28]" : "bg-[#f8f9f4] border-[#dde0ce] hover:border-[#6b7c3a]",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"].join(" ")}
    >
      <div className={["w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0 relative", value ? "bg-[#4e5c28]" : "bg-[#d0d4bc]"].join(" ")}>
        <div className={["absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300", value ? "left-5" : "left-0.5"].join(" ")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={["text-sm font-semibold", value ? "text-[#4e5c28]" : "text-[#3a4020]"].join(" ")}>Domiciliation bancaire</div>
        <div className="text-xs text-[#8a9060]">Compte bancaire configuré</div>
      </div>
      {value && <CheckCircle2 size={15} className="text-[#4e5c28] flex-shrink-0" />}
    </button>
  );
}

export function CreateEmployeeForm() {
  const { mutateAsync, isPending } = useCreateEmployee();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(EmployeeSchema),
    defaultValues: { hasBankDomiciliation: false, free: false, shift: "" },
  });

  const department     = watch("department");
  const jobTitle       = watch("jobTitle");
  const productionLine = watch("productionLine");
  const employmentType = watch("employmentType");
  const shift          = watch("shift") || "";
  const bank           = watch("hasBankDomiciliation") as boolean;

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const formatted = data as unknown as z.output<typeof EmployeeSchema>;
      const payload: EmployeeRequest = {
        ...formatted,
        hireDate: formatted.hireDate instanceof Date
          ? formatted.hireDate.toISOString().split("T")[0]
          : String(formatted.hireDate),
      };
      await mutateAsync(payload);
      await Swal.fire({ icon: "success", title: "Succès !", text: "L'employé a été créé avec succès.", confirmButtonColor: "#4e5c28" });
      reset();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Erreur", text: err.response?.data?.message || err.message || "Une erreur est survenue.", confirmButtonColor: "#e11d48" });
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        .c1 { animation: fadeUp .3s ease .00s both; }
        .c2 { animation: fadeUp .3s ease .07s both; }
        .c3 { animation: fadeUp .3s ease .14s both; }
        .c4 { animation: fadeUp .3s ease .21s both; }
        .c5 { animation: fadeUp .3s ease .28s both; }
        .spin-anim { animation: spin 1s linear infinite; }
      `}</style>

      <div className="min-h-screen bg-[#f4f6ec]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="max-w-5xl mx-auto px-5 py-8">

          {/* Header */}
          <div className="mb-6 c1">
            <div className="inline-flex items-center gap-1.5 bg-[#e8ebdc] text-[#4e5c28] rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles size={11} /> Ressources Humaines
            </div>
            <h1 className="text-2xl font-black text-[#1a1f0f] tracking-tight">Créer un nouvel employé</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── Soft grouping wrapper card ───────────────────────────────── */}
            <div
              className="rounded-3xl border border-[#b8cc90]/60 p-5 mb-4 c2 overflow-hidden relative"
              style={{
                background: "linear-gradient(145deg, #e8f0d8 0%, #dde8c4 30%, #d4e2b8 60%, #ccdba8 100%)",
                boxShadow: "0 4px 24px 0 rgba(78,92,40,0.10), inset 0 1px 0 rgba(255,255,255,0.70)",
              }}
            >
              {/* Subtle decorative dots top-right */}
              <div
                aria-hidden
                className="absolute top-3 right-3 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, #4e5c28 1.5px, transparent 1.5px)",
                  backgroundSize: "10px 10px",
                  width: 70,
                  height: 40,
                }}
              />

              {/* Top two equal-height cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

                {/* Card 1 — Informations personnelles */}
                <div className="h-full [&>div]:h-full">
                <SectionCard icon={User} title="Informations personnelles" subtitle="Identité de l'employé">
                  <div className="space-y-3 h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <TextInput label="Matricule" required {...register("matricule")} placeholder="123456" disabled={isPending} error={errors.matricule?.message} />
                        <div>
                          <label className="block text-xs font-bold text-[#4e5c28] uppercase tracking-wider mb-1.5">
                            Civilité <span className="text-rose-500">*</span>
                          </label>
                          <select {...register("civility")} disabled={isPending}
                            className={["w-full px-3.5 py-2.5 rounded-xl border-2 text-sm font-medium outline-none transition-all duration-200 cursor-pointer focus:ring-4 focus:border-[#6b7c3a] focus:ring-[#6b7c3a]/10 focus:bg-white",
                              errors.civility ? "border-rose-300 bg-rose-50" : "border-[#dde0ce] bg-[#f8f9f4] hover:border-[#6b7c3a]",
                              isPending ? "opacity-40" : ""].join(" ")}
                          >
                            <option value="">Sélectionner</option>
                            <option value="MADAME">Madame</option>
                            <option value="MONSIEUR">Monsieur</option>
                            <option value="MLLE">Mademoiselle</option>
                          </select>
                          {errors.civility && <p className="flex items-center gap-1 mt-1 text-xs text-rose-500"><AlertCircle size={11} />{errors.civility.message}</p>}
                        </div>
                      </div>
                      <TextInput label="Nom et Prénom" required {...register("fullName")} placeholder="JEAN DUPONT" disabled={isPending} error={errors.fullName?.message} />
                    </div>
                  </div>
                </SectionCard>
                </div>

                {/* Card 2 — Affectation au poste */}
                <div className="h-full [&>div]:h-full">
                <SectionCard icon={Briefcase} title="Affectation au poste" subtitle="Rôle et emplacement">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField label="Département" required value={department || ""} onChange={v => setValue("department", v, { shouldValidate: true })} options={DEPARTMENTS} error={errors.department?.message} disabled={isPending} />
                      <SelectField label="Poste Occupé" required value={jobTitle || ""} onChange={v => setValue("jobTitle", v, { shouldValidate: true })} options={JOB_TITLES} error={errors.jobTitle?.message} disabled={isPending} />
                    </div>
                    <SelectField label="Ligne de Production" value={productionLine || ""} onChange={v => setValue("productionLine", v, { shouldValidate: true })} options={PRODUCTION_LINES} placeholder="Optionnel" disabled={isPending} />
                    <ShiftCard value={shift} onChange={v => setValue("shift", v, { shouldValidate: true })} disabled={isPending} />
                  </div>
                </SectionCard>
                </div>
              </div>

              {/* Thin divider */}
              <div className="my-4 border-t border-dashed border-[#a8bc78]/50" />

              {/* Card 3 — Contrat & Hiérarchie */}
              <div className="c3">
                <SectionCard icon={FileText} title="Contrat & Hiérarchie" subtitle="Type de contrat, dates et superviseur">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                    <SelectField label="Type de Travail" required value={employmentType || ""} onChange={v => setValue("employmentType", v, { shouldValidate: true })} options={EMPLOYMENT_TYPES} error={errors.employmentType?.message} disabled={isPending} />
                    <div>
                      <label className="block text-xs font-bold text-[#4e5c28] uppercase tracking-wider mb-1.5">Date d'Embauche <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input type="date" {...register("hireDate")} disabled={isPending}
                          className={["w-full px-3.5 py-2.5 pr-9 rounded-xl border-2 text-sm font-medium outline-none transition-all duration-200 focus:ring-4 focus:border-[#6b7c3a] focus:ring-[#6b7c3a]/10 focus:bg-white",
                            errors.hireDate ? "border-rose-300 bg-rose-50" : "border-[#dde0ce] bg-[#f8f9f4] hover:border-[#6b7c3a]",
                            isPending ? "opacity-40" : ""].join(" ")} />
                        <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9060] pointer-events-none" />
                      </div>
                      {errors.hireDate && <p className="flex items-center gap-1 mt-1 text-xs text-rose-500"><AlertCircle size={11} />{errors.hireDate.message}</p>}
                    </div>
                    <TextInput label="Superviseur" {...register("supervisor")} placeholder="Matricule (optionnel)" disabled={isPending} error={errors.supervisor?.message} />
                    <div>
                      <label className="block text-xs font-bold text-[#4e5c28] uppercase tracking-wider mb-1.5">Domiciliation</label>
                      <BankToggle value={bank} onChange={v => setValue("hasBankDomiciliation", v)} disabled={isPending} />
                    </div>
                  </div>
                </SectionCard>
              </div>

            </div>{/* end grouping wrapper */}

            {/* Submit bar */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-[#e0e3ce] shadow-sm px-5 py-3.5 c4">
              <p className="text-xs text-[#8a9060]"><span className="text-rose-500 font-bold">*</span> Champs obligatoires</p>
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => reset()} disabled={isPending}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#6b7c3a] border-2 border-[#dde0ce] bg-white hover:border-[#6b7c3a] hover:bg-[#f4f6ec] transition-all duration-200 disabled:opacity-40">
                  Réinitialiser
                </button>
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#4e5c28] to-[#6b7c3a] hover:from-[#3b4520] hover:to-[#4e5c28] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#4e5c28]/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0">
                  {isPending ? <><Loader2 size={13} className="spin-anim" />Création…</> : <><Sparkles size={13} />Créer l'employé</>}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}