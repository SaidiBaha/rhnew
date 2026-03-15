// src/pages/CreateEmployeeForm.tsx
import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Swal from "sweetalert2";
import { User, Briefcase, FileText, Loader2, ChevronDown, Check, AlertCircle } from "lucide-react";
import { EmployeeSchema } from "@/modules/employee/schema";
import { useCreateEmployee } from "@/lib/data/employee";
import { DEPARTMENTS, JOB_TITLES, PRODUCTION_LINES, EMPLOYMENT_TYPES } from "@/modules/employee/constants";
import type { EmployeeRequest } from "@/modules/employee/types";

type FormData = z.input<typeof EmployeeSchema>;

const C = {
  bg:            "#e8ebe0",
  wrapper:       "#3a4e18",
  wrapperBorder: "rgba(143,176,64,0.3)",
  card:          "#ffffff",
  cardBorder:    "rgba(143,176,64,0.15)",
  accent:        "#8fb040",
  accentDark:    "#5a7820",
  accentLight:   "#b8d060",
  fieldBg:       "#f2f5e8",
  fieldBorder:   "#c4d280",
  fieldFocus:    "#8fb040",
  label:         "#4a6418",
  text:          "#1a2608",
  textMuted:     "#6a8030",
};

function Lbl({ text, req }: { text: string; req?: boolean }) {
  return (
    <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 800, color: C.label, letterSpacing: "1px", textTransform: "uppercase" }}>
      {text}{req && <span style={{ color: "#e05050", marginLeft: 2 }}>*</span>}
    </p>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, color: "#e05050", fontSize: 11, fontWeight: 600 }}>
      <AlertCircle size={10} />{msg}
    </div>
  );
}

function FInput({ label, req, error, disabled, delay = 0, ...props }:
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; req?: boolean; error?: string; delay?: number }) {
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <Lbl text={label} req={req} />
      <input
        {...props} disabled={disabled}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: "100%", boxSizing: "border-box", padding: "13px 15px",
          fontSize: 14, fontWeight: 500, color: C.text,
          background: focused ? "#fff" : error ? "#fff6f6" : C.fieldBg,
          border: `1.5px solid ${error ? "#e05050" : focused ? C.fieldFocus : C.fieldBorder}`,
          borderRadius: 10, outline: "none", fontFamily: "inherit",
          boxShadow: focused ? `0 0 0 3px rgba(143,176,64,0.18), 0 4px 12px rgba(143,176,64,0.1)` : "0 1px 3px rgba(0,0,0,0.05)",
          transition: "all 0.2s ease", transform: focused ? "scale(1.01)" : "scale(1)",
          opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "text",
        }}
      />
      <Err msg={error} />
    </div>
  );
}

function FSelect({ label, req, error, disabled, options, placeholder, value, onChange, delay = 0 }:
  { label: string; req?: boolean; error?: string; disabled?: boolean; options: readonly string[]; placeholder?: string; value: string; onChange: (v: string) => void; delay?: number }) {
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <Lbl text={label} req={req} />
      <div style={{ position: "relative" }}>
        <select
          value={value} onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          disabled={disabled}
          style={{
            width: "100%", boxSizing: "border-box", padding: "13px 38px 13px 15px",
            fontSize: 14, fontWeight: 500, color: value ? C.text : C.textMuted,
            background: focused ? "#fff" : error ? "#fff6f6" : C.fieldBg,
            border: `1.5px solid ${error ? "#e05050" : focused ? C.fieldFocus : C.fieldBorder}`,
            borderRadius: 10, outline: "none", fontFamily: "inherit", appearance: "none",
            boxShadow: focused ? `0 0 0 3px rgba(143,176,64,0.18), 0 4px 12px rgba(143,176,64,0.1)` : "0 1px 3px rgba(0,0,0,0.05)",
            transition: "all 0.2s ease", transform: focused ? "scale(1.01)" : "scale(1)",
            opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <option value="">{placeholder || "Sélectionner…"}</option>
          {options.map(o => <option key={o} value={o} style={{ color: C.text }}>{o}</option>)}
        </select>
        <ChevronDown size={14} style={{ position: "absolute", right: 13, top: "50%", transform: `translateY(-50%) rotate(${focused ? 180 : 0}deg)`, color: C.accent, pointerEvents: "none", transition: "transform 0.25s" }} />
      </div>
      <Err msg={error} />
    </div>
  );
}

function FCivility({ register, error, disabled }: { register: any; error?: string; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <Lbl text="Civilité" req />
      <div style={{ position: "relative" }}>
        <select
          {...register("civility")} disabled={disabled}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", boxSizing: "border-box", padding: "13px 38px 13px 15px",
            fontSize: 14, fontWeight: 500, color: C.text,
            background: focused ? "#fff" : C.fieldBg,
            border: `1.5px solid ${error ? "#e05050" : focused ? C.fieldFocus : C.fieldBorder}`,
            borderRadius: 10, outline: "none", fontFamily: "inherit", appearance: "none",
            boxShadow: focused ? `0 0 0 3px rgba(143,176,64,0.18)` : "0 1px 3px rgba(0,0,0,0.05)",
            transition: "all 0.2s ease",
            opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <option value="">—</option>
          <option value="MONSIEUR">M.</option>
          <option value="MADAME">Mme</option>
          <option value="MLLE">Mlle</option>
        </select>
        <ChevronDown size={14} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: C.accent, pointerEvents: "none" }} />
      </div>
      <Err msg={error} />
    </div>
  );
}

function FShift({ value, onChange, disabled, delay = 0 }: { value: string; onChange: (v: string) => void; disabled?: boolean; delay?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 800, color: C.label, letterSpacing: "1px", textTransform: "uppercase" }}>
        Shift <span style={{ color: C.textMuted, fontWeight: 500, textTransform: "none", letterSpacing: 0, fontSize: 10 }}>(optionnel)</span>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(["A", "B"] as const).map(opt => {
          const on = value === opt;
          return (
            <button key={opt} type="button" disabled={disabled} onClick={() => onChange(on ? "" : opt)}
              style={{
                padding: "12px 4px", borderRadius: 10,
                border: `1.5px solid ${on ? C.accent : C.fieldBorder}`,
                background: on ? `linear-gradient(135deg,${C.accentDark},${C.accent})` : C.fieldBg,
                color: on ? "#fff" : C.accent, fontWeight: 700, fontSize: 12,
                cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: on ? `0 4px 14px rgba(143,176,64,0.4)` : "0 1px 3px rgba(0,0,0,0.05)",
                transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                transform: on ? "scale(1.04)" : "scale(1)",
                opacity: disabled ? 0.5 : 1,
              }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: on ? "rgba(255,255,255,0.25)" : "#d8e898", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: on ? "#fff" : C.accentDark }}>{opt}</span>
              Poste {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FBank({ value, onChange, disabled, delay = 0 }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; delay?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <Lbl text="Domiciliation" />
      <button type="button" disabled={disabled} onClick={() => !disabled && onChange(!value)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 13px", borderRadius: 10,
          border: `1.5px solid ${value ? C.accent : C.fieldBorder}`,
          background: value ? "linear-gradient(135deg,#e8f5d0,#d8edac)" : C.fieldBg,
          cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
          boxShadow: value ? `0 3px 12px rgba(143,176,64,0.25)` : "0 1px 3px rgba(0,0,0,0.05)",
          transition: "all 0.25s ease", opacity: disabled ? 0.5 : 1, boxSizing: "border-box",
        }}>
        <div style={{ width: 36, height: 20, borderRadius: 10, position: "relative", flexShrink: 0, background: value ? `linear-gradient(90deg,${C.accentDark},${C.accent})` : "#c4d280", transition: "background 0.25s", boxShadow: value ? "0 2px 6px rgba(143,176,64,0.4)" : "none" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 19 : 3, transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: value ? C.accentDark : C.text }}>Domiciliation bancaire</div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>Compte bancaire configuré</div>
        </div>
        {value && <Check size={13} color={C.accent} />}
      </button>
    </div>
  );
}

function SecHead({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 18, borderBottom: "1.5px solid rgba(143,176,64,0.12)" }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg,${C.accentDark},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 6px 16px rgba(90,120,32,0.35)` }}>
        <Icon size={19} color="#fff" strokeWidth={2} />
      </div>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "2px", textTransform: "uppercase" }}>{sub}</p>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: "-0.3px" }}>{title}</p>
      </div>
    </div>
  );
}

export function CreateEmployeeForm() {
  const { mutateAsync, isPending } = useCreateEmployee();
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(EmployeeSchema),
    defaultValues: { hasBankDomiciliation: false, free: false, shift: "" },
  });

  const department     = watch("department")           || "";
  const jobTitle       = watch("jobTitle")             || "";
  const productionLine = watch("productionLine")       || "";
  const employmentType = watch("employmentType")       || "";
  const shift          = watch("shift")                || "";
  const bank           = watch("hasBankDomiciliation") as boolean;

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const formatted = data as unknown as z.output<typeof EmployeeSchema>;
      const payload: EmployeeRequest = {
        ...formatted,
        hireDate: formatted.hireDate instanceof Date ? formatted.hireDate.toISOString().split("T")[0] : String(formatted.hireDate),
      };
      await mutateAsync(payload);
      await Swal.fire({ icon: "success", title: "Succès !", text: "L'employé a été créé avec succès.", confirmButtonColor: C.accent });
      reset();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Erreur", text: err.response?.data?.message || err.message || "Une erreur est survenue.", confirmButtonColor: "#e11d48" });
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin 1s linear infinite}
        *{box-sizing:border-box}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:0.5;filter:invert(40%) sepia(50%) saturate(400%) hue-rotate(50deg)}
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter',system-ui,sans-serif", padding: "36px 24px 56px" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 28, animation: "fadeUp 0.35s ease both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.wrapper, borderRadius: 50, padding: "6px 16px 6px 10px", marginBottom: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.accentLight }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.8)", letterSpacing: "2.5px", textTransform: "uppercase" }}>Ressources Humaines</span>
            </div>
            <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: "-0.5px" }}>Créer un nouvel employé</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.textMuted, fontWeight: 500 }}>Remplissez les informations ci-dessous pour créer un nouveau profil.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── 3 white cards grouped with big border ── */}
            <div style={{
              border: `2px solid ${C.accent}`,
              borderRadius: 18,
              padding: 10,
              marginBottom: 16,
              animation: "fadeUp 0.4s ease 80ms both",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>

              {/* Card 1 */}
              <div style={{
                background: C.card,
                borderRadius: 12,
                padding: "32px 32px 30px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                border: `1.5px solid ${C.accent}`,
              }}>
                <SecHead icon={User} title="Informations Personnelles" sub="Identité de l'employé" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 2fr", gap: 16, alignItems: "start" }}>
                  <FInput label="Matricule" req error={errors.matricule?.message} disabled={isPending} placeholder="ex: EMP-001" {...register("matricule")} delay={60} />
                  <FCivility register={register} error={errors.civility?.message} disabled={isPending} />
                  <FInput label="Nom et Prénom" req error={errors.fullName?.message} disabled={isPending} placeholder="Jean Dupont" {...register("fullName")} delay={100} />
                </div>
              </div>

              {/* Card 2 */}
              <div style={{
                background: C.card,
                borderRadius: 12,
                padding: "32px 32px 30px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                border: `1.5px solid ${C.accent}`,
              }}>
                <SecHead icon={Briefcase} title="Affectation au Poste" sub="Département & rôle" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, alignItems: "start" }}>
                  <FSelect label="Département" req error={errors.department?.message} value={department} onChange={v => setValue("department", v, { shouldValidate: true })} options={DEPARTMENTS} disabled={isPending} delay={60} />
                  <FSelect label="Poste Occupé" req error={errors.jobTitle?.message} value={jobTitle} onChange={v => setValue("jobTitle", v, { shouldValidate: true })} options={JOB_TITLES} disabled={isPending} delay={100} />
                  <FSelect label="Ligne de Production" placeholder="Optionnel" value={productionLine} onChange={v => setValue("productionLine", v, { shouldValidate: true })} options={PRODUCTION_LINES} disabled={isPending} delay={140} />
                  <FShift value={shift} onChange={v => setValue("shift", v, { shouldValidate: true })} disabled={isPending} delay={180} />
                </div>
              </div>

              {/* Card 3 */}
              <div style={{
                background: C.card,
                borderRadius: 12,
                padding: "32px 32px 30px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                border: `1.5px solid ${C.accent}`,
              }}>
                <SecHead icon={FileText} title="Contrat & Hiérarchie" sub="Détails contractuels" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, alignItems: "start" }}>
                  <FSelect label="Type de Contrat" req error={errors.employmentType?.message} value={employmentType} onChange={v => setValue("employmentType", v, { shouldValidate: true })} options={EMPLOYMENT_TYPES} disabled={isPending} delay={60} />
                  <FInput label="Date d'Embauche" req type="date" error={errors.hireDate?.message} disabled={isPending} {...register("hireDate")} delay={100} />
                  <FInput label="Superviseur" placeholder="Matricule (optionnel)" error={errors.supervisor?.message} disabled={isPending} {...register("supervisor")} delay={140} />
                  <FBank value={bank} onChange={v => setValue("hasBankDomiciliation", v)} disabled={isPending} delay={180} />
                </div>
              </div>

            </div>

            {/* ── Submit bar ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: C.card, borderRadius: 16, padding: "18px 26px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              border: `2px solid ${C.accent}`,
              animation: "fadeUp 0.4s ease 200ms both",
            }}>
              <p style={{ margin: 0, fontSize: 12, color: C.textMuted, fontWeight: 500 }}>
                <span style={{ color: "#e05050", fontWeight: 700 }}>*</span> Champs obligatoires
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => reset()} disabled={isPending}
                  style={{
                    padding: "11px 24px", borderRadius: 10,
                    border: `1.5px solid ${C.fieldBorder}`,
                    background: "#fff", color: C.accentDark,
                    fontSize: 13, fontWeight: 700,
                    cursor: isPending ? "not-allowed" : "pointer",
                    fontFamily: "inherit", opacity: isPending ? 0.4 : 1,
                  }}>
                  Réinitialiser
                </button>
                <button type="submit" disabled={isPending}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "11px 30px", borderRadius: 10,
                    background: isPending ? "#aaa" : `linear-gradient(135deg,${C.accentDark},${C.accent})`,
                    color: "#fff", fontSize: 13, fontWeight: 800,
                    border: "none", cursor: isPending ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    boxShadow: isPending ? "none" : `0 6px 18px rgba(90,120,32,0.4)`,
                  }}>
                  {isPending ? <><Loader2 size={13} className="spin" /> Création…</> : <>Créer l'employé</>}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}