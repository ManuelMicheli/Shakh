import { cn } from "@/lib/utils";

/**
 * Marchio del brand: silhouette di un pedone (lo stesso vettore del set di
 * pezzi cburnett della scacchiera), in `currentColor` così eredita il colore
 * del testo e resta monocromo coerente col design system. Usato accanto al
 * wordmark "Shakh" e come base della favicon.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 45 45"
      aria-hidden
      fill="currentColor"
      className={cn("inline-block", className)}
    >
      <circle cx="22.5" cy="12" r="5.2" />
      <path d="M18.4 18.6c2.7 1.5 5.5 1.5 8.2 0 .3 1 .1 2-.6 2.9h-7c-.7-.9-.9-1.9-.6-2.9z" />
      <path d="M18.6 23.1h7.8c2.3 2.6 2.8 6.2 1.2 9.4h-10.2c-1.6-3.2-1.1-6.8 1.2-9.4z" />
      <path d="M14.6 33.4h15.8l1.8 3.3h-19.4z" />
      <rect x="12" y="37.4" width="21" height="3.4" rx="1.2" />
    </svg>
  );
}
