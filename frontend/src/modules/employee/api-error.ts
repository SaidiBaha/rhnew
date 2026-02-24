// src/lib/utils/api-error.ts
import axios, { AxiosError } from "axios";
import type { ErrorDto } from "./types";
import toast from "react-hot-toast";



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
      errors: Array.isArray(data?.errors) ? data.errors : [],
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

// Fonction utilitaire pour logger les erreurs dans la console
export function logError(context: string, error: unknown) {
  const errorDto = extractErrorDto(error);
  
  console.group(`🚨 Erreur dans ${context}`);
  console.error("Message:", errorDto.message);
  if (errorDto.code) console.error("Code:", errorDto.code);
  if (errorDto.status) console.error("Status:", errorDto.status);
  if (errorDto.errors.length > 0) {
    console.error("Détails des erreurs:");
    errorDto.errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`));
  }
  console.error("Raw:", errorDto.raw);
  console.groupEnd();
}

// Fonction pour afficher les erreurs utilisateur
export function displayError(error: unknown, defaultMessage: string = "Une erreur est survenue"): string {
  const errorDto = extractErrorDto(error);
  
  // Si on a des erreurs détaillées, on les affiche
  if (errorDto.errors.length > 0) {
    if (errorDto.errors.length === 1) {
      return errorDto.errors[0];
    }
    // Pour plusieurs erreurs, on les affiche avec des puces
    return `Plusieurs erreurs détectées:\n• ${errorDto.errors.join('\n• ')}`;
  }
  
  // Sinon on affiche le message principal
  return errorDto.message || defaultMessage;
}

// Fonction pour afficher un toast d'erreur
export function showErrorToast(error: unknown, title?: string) {
  const errorDto = extractErrorDto(error);
  
  // Log dans la console
  logError(title || "API Error", error);
  
  // Construction du message pour le toast
  let message = errorDto.message;
  
  // Si on a des erreurs détaillées, on les ajoute
  if (errorDto.errors.length > 0) {
    if (errorDto.errors.length === 1) {
      message = errorDto.errors[0];
    } else {
      // Pour le toast, on prend seulement la première erreur pour ne pas surcharger
      message = errorDto.errors[0];
      if (errorDto.errors.length > 1) {
        message += ` (et ${errorDto.errors.length - 1} autre(s) erreur(s))`;
      }
    }
  }
  
  // Afficher le toast
  toast.error(message, {
    duration: 6000,
    icon: '❌',
  });
  
  return errorDto;
}

