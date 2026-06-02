import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compone className Tailwind in modo sicuro:
 * clsx per la logica condizionale, tailwind-merge per risolvere i conflitti.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
