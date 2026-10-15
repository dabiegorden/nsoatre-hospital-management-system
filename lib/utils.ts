import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Message of a caught value (`catch` gives `unknown`); "" when it has none. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return ""
}

/** True for the error `fetch` throws when its AbortController fires. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}
