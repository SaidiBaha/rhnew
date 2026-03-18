import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";

import { EmployeeSchema } from "@/modules/employee/schema";
import { useCreateEmployee, useFetchEmployees } from "@/lib/data/employee";
import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Civilities } from "@/modules/employee/types";
import {
  DEPARTMENTS, JOB_TITLES, PRODUCTION_LINES, EMPLOYMENT_TYPES,
} from "@/modules/employee/constants";

type FormData = z.input<typeof EmployeeSchema>;

function CreateEmployeePage() {
  const navigate = useNavigate();
  const createEmployee = useCreateEmployee();
  const { data: employees } = useFetchEmployees();

  const supervisors = (employees ?? []).filter(
    (e) => e.operators && e.operators.length > 0
  );

  const form = useForm<FormData>({
    resolver: zodResolver(EmployeeSchema),
    defaultValues: {
      hasBankDomiciliation: false,
      free: false,
      hireDate: new Date(),
    },
  });

  function onSubmit(data: FormData) {
    createEmployee.mutate(data as z.infer<typeof EmployeeSchema>, {
      onSuccess: () => {
        form.reset();
        navigate("/employees");
      },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      const formEl = e.currentTarget;
      const allFocusable = Array.from(
        formEl.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]), select, [role="combobox"]'
        )
      ).filter((el) => !el.hasAttribute("disabled"));

      const index = allFocusable.indexOf(e.target as HTMLElement);
      if (index > -1 && index < allFocusable.length - 1) {
        allFocusable[index + 1].focus();
      }
    }
  }

  const toOptions = (arr: readonly string[]) =>
    arr.map((v) => ({ label: v, value: v }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Heading
          title="Créer un Employé"
          description="Ajouter un nouvel employé au système."
        />
      </div>

      <Separator />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onKeyDown={handleKeyDown}
          className="space-y-6 mt-4"
        >
          {/* ── Section: Identité ── */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)" }}>
              Identité
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="matricule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matricule *</FormLabel>
                    <FormControl>
                      <Input placeholder="123456" {...field} className="ds-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="civility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Civilité *</FormLabel>
                    <FormControl>
                      <select
                        className="ds-input w-full"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="">Sélectionner</option>
                        {Civilities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom et Prénom *</FormLabel>
                    <FormControl>
                      <Input placeholder="JEAN DUPONT" {...field} className="ds-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Section: Poste ── */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)" }}>
              Poste
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Département *</FormLabel>
                    <Combobox
                      options={toOptions(DEPARTMENTS)}
                      onValueChange={field.onChange}
                      defaultValue={field.value as string}
                      placeholder="Sélectionner le département"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poste Occupé *</FormLabel>
                    <Combobox
                      options={toOptions(JOB_TITLES)}
                      onValueChange={field.onChange}
                      defaultValue={field.value as string}
                      placeholder="Sélectionner le poste"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productionLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ligne de Production</FormLabel>
                    <Combobox
                      options={toOptions(PRODUCTION_LINES)}
                      onValueChange={field.onChange}
                      defaultValue={field.value as string}
                      placeholder="Sélectionner la ligne (optionnel)"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poste (Shift)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="POSTE 1"
                        {...field}
                        value={field.value as string || ""}
                        className="ds-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de Travail *</FormLabel>
                    <Combobox
                      options={toOptions(EMPLOYMENT_TYPES)}
                      onValueChange={field.onChange}
                      defaultValue={field.value as string}
                      placeholder="Sélectionner le type"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'Embauche *</FormLabel>
                    <FormControl>
                      <input
                        type="date"
                        className="ds-input font-mono-data w-full"
                        value={
                          field.value instanceof Date
                            ? field.value.toISOString().slice(0, 10)
                            : String(field.value || "")
                        }
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Section: Organisation ── */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)" }}>
              Organisation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supervisor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Superviseur</FormLabel>
                    <Combobox
                      options={supervisors.map((s) => ({
                        label: `${s.matricule} — ${s.fullName}`,
                        value: s.matricule,
                      }))}
                      onValueChange={field.onChange}
                      defaultValue={field.value as string}
                      placeholder="Sélectionner le superviseur (optionnel)"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="jean.dupont@example.com"
                        {...field}
                        value={field.value as string || ""}
                        className="ds-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hasBankDomiciliation"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0 mt-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">
                      Domiciliation bancaire effectuée
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={createEmployee.isPending}
            >
              Réinitialiser
            </Button>
            <Button
              type="submit"
              className="ds-btn-primary"
              disabled={createEmployee.isPending}
            >
              {createEmployee.isPending ? "Création en cours..." : "Créer l'employé"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default CreateEmployeePage;