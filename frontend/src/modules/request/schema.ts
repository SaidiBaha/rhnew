import * as z from "zod";

import { RequestStatuses, RequestTypes } from "@/modules/request/types";

export const RequestSchema = z.object({
  requestType: z.enum(RequestTypes, "Champ obligatoire"),
  comment: z.coerce
    .string<string>()
    .trim()
    .transform((value) => value.toUpperCase())
    .optional(),
  status: z.enum(RequestStatuses).optional(),
  employee: z.string().trim().min(1, "Champ obligatoire"),
});
