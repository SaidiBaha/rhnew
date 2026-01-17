import { z } from "zod";

export const LoginSchema = z.object({
  matricule: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Le mot de passe actuel est obligatoire"),
        newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au minimum 8 caractères"),
        confirmationPassword: z.string().min(1, "La confirmation est obligatoire"),
    })
    .refine((data) => data.newPassword === data.confirmationPassword, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmationPassword"],
    });

