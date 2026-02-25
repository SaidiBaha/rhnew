// src/pages/CreateEmployeeForm.tsx
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Swal from "sweetalert2";
import { CalendarIcon, Loader2, ChevronDown, Search } from "lucide-react";
import { EmployeeSchema } from "@/modules/employee/schema";
import { useCreateEmployee } from "@/lib/data/employee";
import { DEPARTMENTS, JOB_TITLES, PRODUCTION_LINES, EMPLOYMENT_TYPES } from "@/modules/employee/constants";
import type { EmployeeRequest } from "@/modules/employee/types";

const CreateEmployeeFormSchema = EmployeeSchema;
type FormData = z.input<typeof EmployeeSchema>;

interface SearchSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

function SearchSelect({
  id,
  label,
  value,
  onChange,
  options,
  error,
  placeholder = "Sélectionner ou taper pour rechercher",
  required = false,
  disabled = false,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilteredOptions(options.filter(o => o.toLowerCase().includes(term.toLowerCase())));
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm("");
    setFilteredOptions(options);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && "*"}
      </label>

      <div className="relative">
        <div
          className={`flex items-center w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white cursor-pointer ${error ? "border-red-500" : ""} ${disabled ? "bg-gray-50 cursor-not-allowed" : ""}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="flex-1 truncate">
            {value || <span className="text-gray-400">{placeholder}</span>}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="sticky top-0 p-2 bg-white border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>

            <div className="py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">Aucun résultat trouvé</div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option}
                    className={`px-3 py-2 cursor-pointer hover:bg-emerald-50 text-sm ${value === option ? "bg-emerald-50 text-emerald-700" : "text-gray-700"}`}
                    onClick={() => handleSelect(option)}
                  >
                    {option}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function CreateEmployeeForm() {
  const { mutateAsync, isPending } = useCreateEmployee();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(CreateEmployeeFormSchema),
    defaultValues: {
      hasBankDomiciliation: false,
      free: false,
    },
  });

  const departmentValue = watch("department");
  const jobTitleValue = watch("jobTitle");
  const productionLineValue = watch("productionLine");
  const employmentTypeValue = watch("employmentType");

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const formattedData = data as unknown as z.output<typeof EmployeeSchema>;

      const payload: EmployeeRequest = {
        ...formattedData,
        hireDate: formattedData.hireDate instanceof Date
          ? formattedData.hireDate.toISOString().split("T")[0]
          : String(formattedData.hireDate),
      };

      console.log("📤 Requête envoyée (payload) :", payload);

      await mutateAsync(payload);

      await Swal.fire({
        icon: "success",
        title: "Succès !",
        text: "L'employé a été créé avec succès.",
        confirmButtonColor: "#10b981",
      });

      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Une erreur est survenue lors de la création.";

      await Swal.fire({
        icon: "error",
        title: "Erreur",
        text: errorMessage,
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
  const errorClass = "mt-1 text-sm text-red-600";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Créer un nouvel employé</h1>
        <p className="text-gray-600 mt-2">
          Remplissez tous les champs obligatoires pour ajouter un nouvel employé au système.
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-emerald-700 font-medium">✓ Employé créé avec succès !</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Matricule */}
          <div>
            <label htmlFor="matricule" className={labelClass}>Matricule *</label>
            <input
              id="matricule"
              type="text"
              {...register("matricule")}
              className={`${inputClass} ${errors.matricule ? "border-red-500" : ""}`}
              placeholder="123456"
              disabled={isPending}
            />
            {errors.matricule && <p className={errorClass}>{errors.matricule.message}</p>}
          </div>

          {/* Civilité */}
          <div>
            <label htmlFor="civility" className={labelClass}>Civilité *</label>
            <select
              id="civility"
              {...register("civility")}
              className={`${inputClass} ${errors.civility ? "border-red-500" : ""}`}
              disabled={isPending}
            >
              <option value="">Sélectionner</option>
              <option value="MADAME">Madame</option>
              <option value="MONSIEUR">Monsieur</option>
              <option value="MLLE">Mademoiselle</option>
            </select>
            {errors.civility && <p className={errorClass}>{errors.civility.message}</p>}
          </div>

          {/* Nom complet */}
          <div className="md:col-span-2">
            <label htmlFor="fullName" className={labelClass}>Nom et Prénom *</label>
            <input
              id="fullName"
              type="text"
              {...register("fullName")}
              className={`${inputClass} ${errors.fullName ? "border-red-500" : ""}`}
              placeholder="JEAN DUPONT"
              disabled={isPending}
            />
            {errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}
          </div>

          {/* Département */}
          <SearchSelect
            id="department"
            label="Département"
            value={departmentValue || ""}
            onChange={(value) => setValue("department", value, { shouldValidate: true })}
            options={DEPARTMENTS}
            error={errors.department?.message}
            required
            disabled={isPending}
          />

          {/* Poste occupé */}
          <SearchSelect
            id="jobTitle"
            label="Poste Occupé"
            value={jobTitleValue || ""}
            onChange={(value) => setValue("jobTitle", value, { shouldValidate: true })}
            options={JOB_TITLES}
            error={errors.jobTitle?.message}
            required
            disabled={isPending}
          />

          {/* Ligne de production */}
          <SearchSelect
            id="productionLine"
            label="Ligne de Production"
            value={productionLineValue || ""}
            onChange={(value) => setValue("productionLine", value, { shouldValidate: true })}
            options={PRODUCTION_LINES}
            error={errors.productionLine?.message}
            placeholder="Sélectionner une ligne (optionnel)"
            disabled={isPending}
          />

          {/* Poste/Shift */}
          <div>
            <label htmlFor="shift" className={labelClass}>Poste (Shift)</label>
            <input
              id="shift"
              type="text"
              {...register("shift")}
              className={inputClass}
              placeholder="POSTE 1"
              disabled={isPending}
            />
          </div>

          {/* Type de travail */}
          <SearchSelect
            id="employmentType"
            label="Type de Travail"
            value={employmentTypeValue || ""}
            onChange={(value) => setValue("employmentType", value, { shouldValidate: true })}
            options={EMPLOYMENT_TYPES}
            error={errors.employmentType?.message}
            required
            disabled={isPending}
          />

          {/* Date d'embauche */}
          <div>
            <label htmlFor="hireDate" className={labelClass}>Date d'Embauche *</label>
            <div className="relative">
              <input
                id="hireDate"
                type="date"
                {...register("hireDate")}
                className={`${inputClass} ${errors.hireDate ? "border-red-500" : ""}`}
                disabled={isPending}
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            {errors.hireDate && <p className={errorClass}>{errors.hireDate.message}</p>}
          </div>

          {/* Superviseur */}
          <div>
            <label htmlFor="supervisor" className={labelClass}>Matricule du Superviseur</label>
            <input
              id="supervisor"
              type="text"
              {...register("supervisor")}
              className={inputClass}
              placeholder="12345 (optionnel)"
              disabled={isPending}
            />
            {errors.supervisor && <p className={errorClass}>{errors.supervisor.message}</p>}
          </div>

          {/* Domiciliation bancaire */}
          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                id="hasBankDomiciliation"
                type="checkbox"
                {...register("hasBankDomiciliation")}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                disabled={isPending}
              />
              <label htmlFor="hasBankDomiciliation" className="ml-2 block text-sm text-gray-700">
                Domiciliation bancaire effectuée
              </label>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            disabled={isPending}
          >
            Réinitialiser
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Créer l'employé"
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Informations importantes :</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Les champs marqués d'un astérisque (*) sont obligatoires</li>
          <li>• Le matricule doit contenir uniquement des chiffres</li>
          <li>• Le matricule du superviseur doit également contenir uniquement des chiffres</li>
          <li>• Les noms et départements seront automatiquement convertis en majuscules</li>
          <li>• Utilisez la barre de recherche pour trouver rapidement votre département, poste, etc.</li>
        </ul>
      </div>
    </div>
  );
}