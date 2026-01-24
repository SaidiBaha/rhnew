// src/modules/employee/components/CreateEmployeeForm.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";


import Swal from "sweetalert2";
import { CalendarIcon, Loader2 } from "lucide-react";
import { EmployeeSchema } from "@/modules/employee/schema";
import { useCreateEmployee } from "@/lib/data/employee";

// Créer le schéma pour le formulaire
const CreateEmployeeFormSchema = EmployeeSchema;

type FormData = z.infer<typeof CreateEmployeeFormSchema>;

export function CreateEmployeeForm() {
  const { mutateAsync, isPending } = useCreateEmployee();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(CreateEmployeeFormSchema),
    defaultValues: {
      hasBankDomiciliation: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Convertir la date en format string pour le backend
      const formattedData: EmployeeRequest = {
        ...data,
        hireDate: data.hireDate.toISOString().split('T')[0], // Format "yyyy-MM-dd"
        productionLine: data.productionLine || undefined,
        shift: data.shift || undefined,
        supervisor: data.supervisor || undefined,
      };

      await mutateAsync(formattedData);
      
      await Swal.fire({
        icon: "success",
        title: "Succès !",
        text: "L'employé a été créé avec succès.",
        confirmButtonColor: "#10b981",
      });

      setSuccess(true);
      reset();
      
      // Réinitialiser le message de succès après 3 secondes
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
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
          <p className="text-emerald-700 font-medium">
            ✓ Employé créé avec succès !
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Matricule */}
          <div>
            <label htmlFor="matricule" className={labelClass}>
              Matricule *
            </label>
            <input
              id="matricule"
              type="text"
              {...register("matricule")}
              className={`${inputClass} ${errors.matricule ? 'border-red-500' : ''}`}
              placeholder="123456"
            />
            {errors.matricule && (
              <p className={errorClass}>{errors.matricule.message}</p>
            )}
          </div>

          {/* Civilité */}
          <div>
            <label htmlFor="civility" className={labelClass}>
              Civilité *
            </label>
            <select
              id="civility"
              {...register("civility")}
              className={`${inputClass} ${errors.civility ? 'border-red-500' : ''}`}
            >
              <option value="">Sélectionner</option>
              <option value="MADAME">Madame</option>
              <option value="MONSIEUR">Monsieur</option>
              <option value="MLLE">Mademoiselle</option>
            </select>
            {errors.civility && (
              <p className={errorClass}>{errors.civility.message}</p>
            )}
          </div>

          {/* Nom complet */}
          <div className="md:col-span-2">
            <label htmlFor="fullName" className={labelClass}>
              Nom et Prénom *
            </label>
            <input
              id="fullName"
              type="text"
              {...register("fullName")}
              className={`${inputClass} ${errors.fullName ? 'border-red-500' : ''}`}
              placeholder="JEAN DUPONT"
            />
            {errors.fullName && (
              <p className={errorClass}>{errors.fullName.message}</p>
            )}
          </div>

          {/* Département */}
          <div>
            <label htmlFor="department" className={labelClass}>
              Département *
            </label>
            <input
              id="department"
              type="text"
              {...register("department")}
              className={`${inputClass} ${errors.department ? 'border-red-500' : ''}`}
              placeholder="PRODUCTION"
            />
            {errors.department && (
              <p className={errorClass}>{errors.department.message}</p>
            )}
          </div>

          {/* Poste occupé */}
          <div>
            <label htmlFor="jobTitle" className={labelClass}>
              Poste Occupé *
            </label>
            <input
              id="jobTitle"
              type="text"
              {...register("jobTitle")}
              className={`${inputClass} ${errors.jobTitle ? 'border-red-500' : ''}`}
              placeholder="OPERATEUR"
            />
            {errors.jobTitle && (
              <p className={errorClass}>{errors.jobTitle.message}</p>
            )}
          </div>

          {/* Ligne de production */}
          <div>
            <label htmlFor="productionLine" className={labelClass}>
              Ligne de Production
            </label>
            <input
              id="productionLine"
              type="text"
              {...register("productionLine")}
              className={inputClass}
              placeholder="LIGNE A"
            />
          </div>

          {/* Poste/Shift */}
          <div>
            <label htmlFor="shift" className={labelClass}>
              Poste (Shift)
            </label>
            <input
              id="shift"
              type="text"
              {...register("shift")}
              className={inputClass}
              placeholder="POSTE 1"
            />
          </div>

          {/* Type de travail */}
          <div>
            <label htmlFor="employmentType" className={labelClass}>
              Type de Travail *
            </label>
            <select
              id="employmentType"
              {...register("employmentType")}
              className={`${inputClass} ${errors.employmentType ? 'border-red-500' : ''}`}
            >
              <option value="">Sélectionner</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="INTERIM">Intérim</option>
              <option value="STAGIAIRE">Stagiaire</option>
            </select>
            {errors.employmentType && (
              <p className={errorClass}>{errors.employmentType.message}</p>
            )}
          </div>

          {/* Date d'embauche */}
          <div>
            <label htmlFor="hireDate" className={labelClass}>
              Date d'Embauche *
            </label>
            <div className="relative">
              <input
                id="hireDate"
                type="date"
                {...register("hireDate", { valueAsDate: true })}
                className={`${inputClass} ${errors.hireDate ? 'border-red-500' : ''}`}
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            {errors.hireDate && (
              <p className={errorClass}>{errors.hireDate.message}</p>
            )}
          </div>

          {/* Superviseur */}
          <div>
            <label htmlFor="supervisor" className={labelClass}>
              Matricule du Superviseur
            </label>
            <input
              id="supervisor"
              type="text"
              {...register("supervisor")}
              className={inputClass}
              placeholder="12345 (optionnel)"
            />
            {errors.supervisor && (
              <p className={errorClass}>{errors.supervisor.message}</p>
            )}
          </div>

          {/* Domiciliation bancaire */}
          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                id="hasBankDomiciliation"
                type="checkbox"
                {...register("hasBankDomiciliation")}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
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

      {/* Section d'information */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Informations importantes :</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Les champs marqués d'un astérisque (*) sont obligatoires</li>
          <li>• Le matricule doit contenir uniquement des chiffres</li>
          <li>• Le matricule du superviseur doit également contenir uniquement des chiffres</li>
          <li>• Les noms et départements seront automatiquement convertis en majuscules</li>
        </ul>
      </div>
    </div>
  );
}