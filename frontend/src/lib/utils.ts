import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { QueryParams } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isObject = (input: unknown) => input instanceof Object;
export const isArray = (input: unknown) => Array.isArray(input);
export const isEmpty = (input: unknown) => {
  return (
    input === null ||
    input === undefined ||
    (isObject(input) && Object.keys(input).length === 0) ||
    (isArray(input) && (input as unknown[]).length === 0) ||
    (typeof input === "string" && input.trim().length === 0)
  );
};

export const createQueryString = (queryParams: QueryParams) => {
  const params = new URLSearchParams(
    Object.keys(queryParams)
      .filter((key) => !isEmpty(queryParams[key]))
      .reduce(
        (res: QueryParams, key: string) => ((res[key] = queryParams[key]), res),
        {}
      )
  );
  return params.toString();
};

export const parseDuration = (duration: string) => {
  if (isEmpty(duration) || !duration.includes(":")) {
    return null;
  }

  const hours = parseInt(duration.split(":")[0], 10);
  const minutes = parseInt(duration.split(":")[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }

  return {
    hours,
    minutes,
  };
};
