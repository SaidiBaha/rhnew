// src/lib/utils/api-error.ts
import axios, { AxiosError } from "axios";
import type { ErrorDto } from "./types";


export function isAxiosError<T = unknown>(err: unknown): err is AxiosError<T> {
  return axios.isAxiosError(err);
}

export function extractErrorDto(err: unknown): {
  status?: number;
  code?: string | number;
  message: string;
  errors: string[];
  raw: unknown;
} {
  // Cas Axios
  if (isAxiosError<ErrorDto>(err)) {
    const status = err.response?.status;
    const data = err.response?.data;

    return {
      status,
      code: data?.code,
      message: data?.message || err.message || "Erreur API",
      errors: Array.isArray(data?.errors) ? data!.errors! : [],
      raw: err,
    };
  }

  // Cas non-Axios (erreur JS)
  if (err instanceof Error) {
    return {
      message: err.message,
      errors: [],
      raw: err,
    };
  }

  return {
    message: "Une erreur inattendue est survenue",
    errors: [],
    raw: err,
  };
}
