import { format, isValid, parse } from "date-fns";
import z from "zod";

const DurationSchema = z.preprocess(
  (value) => (value === undefined || value === null ? "" : value),
  z.coerce
    .string("Champ invalide")
    .trim()
    .transform((value) => (value ? value.substring(0, 5) : "00:00"))
    .refine((value) => /^([0-1]?\d|2[0-3]):[0-5]\d$/.test(value), {
      message: "Format invalide",
    })
);

export const AttendanceSchema = z.object({
  matricule: z.coerce
    .string("Champ invalide")
    .trim()
    .min(1, "Champ obligatoire")
    .regex(/^\d+$/, "Champ invalide"),
  date: z.coerce
    .string<string>("Champ obligatoire")
    .trim()
    .transform((value, ctx) => {
      const date = parse(value, "dd/MM/yyyy", new Date());
      if (!isValid(date)) {
        ctx.addIssue({
          code: "custom",
          message: "Date invalide (format attendu: jj/mm/aaaa)",
        });
        return z.NEVER;
      }

      return format(date, "yyyy-MM-dd");
    }),
  clockIn: DurationSchema,
  clockOut: DurationSchema,
  totalAttendance: DurationSchema,
  overtime: DurationSchema,
  absenceReason: z.coerce
    .string()
    .trim()
    .transform((value) => (value ? value.toUpperCase() : undefined))
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const UploadAttendanceSchema = z.object({
  files: z
    .array(z.custom<File>())
    .min(1, "Veuillez sélectionner au moins un fichier")
    .max(2, "Vous pouvez sélectionner un maximum de 1 fichier.")
    .refine((files) => files.every((file) => file.size <= 100 * 1024 * 1024), {
      message: "La taille du fichier doit être inférieure à 100 Mo.",
      path: ["files"],
    }),
});
