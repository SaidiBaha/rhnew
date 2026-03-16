// src/modules/employee/schema.ts
import * as z from "zod";

import { Civilities } from "@/modules/employee/types";

export const EmployeeSchema = z
  .object({
    matricule: z.coerce
      .string<string>("Champ invalide")
      .trim()
      .min(1, "Champ obligatoire")
      .regex(/^\d+$/, "Champ invalide"),
    civility: z.enum(Civilities, "Champ invalide"),
    fullName: z
      .string("Champ invalide")
      .trim()
      .min(1, "Champ obligatoire")
      .transform((value) => value.toUpperCase()),
    department: z
      .string("Champ invalide")
      .trim()
      .min(1, "Champ obligatoire")
      .transform((value) => value.toUpperCase()),
    jobTitle: z
      .string("Champ invalide")
      .trim()
      .min(1, "Champ obligatoire")
      .transform((value) => value.toUpperCase()),
    productionLine: z.coerce
      .string<string>()
      .trim()
      .transform((value) => value.toUpperCase())
      .optional(),
    shift: z.coerce
      .string<string>()
      .trim()
      .transform((value) => value.toUpperCase())
      .optional(),
    employmentType: z
      .string("Champ invalide")
      .trim()
      .min(1, "Champ obligatoire")
      .transform((value) => value.toUpperCase()),
    hireDate: z.coerce.date<Date>("Date invalide"),
    supervisor: z.coerce
      .string<string>("Champ invalide")
      .regex(/^\d+$/, "Champ invalide")
      .optional(),
    hasBankDomiciliation: z.coerce
      .boolean("Champ invalide")
      .optional()
      .default(false),
    free: z.coerce
      .boolean()
      .optional()
      .default(false),
    email: z.string().trim().optional().or(z.literal("")),
  })
  .transform((data) => {
    if (data.supervisor === data.matricule) {
      return { ...data, supervisor: undefined };
    }
    return data;
  });

export const UploadEmployeeSchema = z.object({
  files: z
    .array(z.custom<File>())
    .min(1, "Veuillez sélectionner au moins un fichier")
    .max(2, "Vous pouvez sélectionner un maximum de 1 fichier.")
    .refine((files) => files.every((file) => file.size <= 100 * 1024 * 1024), {
      message: "La taille du fichier doit être inférieure à 100 Mo.",
      path: ["files"],
    }),
});