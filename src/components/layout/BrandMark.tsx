import { cn } from "@/lib/utils";

/**
 * Marchio del brand: silhouette del pedone — la stessa forma del glifo "♟"
 * usato come watermark nella dashboard e nella favicon (`src/app/icon.svg`) —
 * in `currentColor` così eredita il colore del testo e resta monocromo coerente
 * col design system. Usato accanto al wordmark "Shakh".
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 45 45"
      aria-hidden
      fill="currentColor"
      className={cn("inline-block", className)}
    >
      <path d="M24.5 14.5C24.5 16.5 28.1 16.8 28.5 18.5C28.5 20.2 25.3 19.6 25.3 21C25.3 26 31.1 28 31.1 33.5C31.1 34.2 29.9 34 29.9 34.5C29.9 35.6 31.9 37 32.9 37L32.9 38.5L12.1 38.5L12.1 37C13.1 37 15.1 35.6 15.1 34.5C15.1 34 13.9 34.2 13.9 33.5C13.9 28 19.7 26 19.7 21C19.7 19.6 16.5 20.2 16.5 18.5C16.9 16.8 20.5 16.5 20.5 14.5Z" />
      <circle cx="22.5" cy="11" r="5.4" />
    </svg>
  );
}
