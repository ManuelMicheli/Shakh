import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BRAND_NAME } from "@/config/brand";

/**
 * Landing placeholder. Verrà rifatta dal prompt 10.
 */
export default function MarketingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-6 md:px-10">
        <span className="font-display text-xl font-semibold tracking-tight">
          {BRAND_NAME}
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-text transition-colors hover:bg-surface-2"
          >
            Accedi
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1
          className="max-w-3xl font-display font-semibold leading-[1.05] tracking-tight"
          style={{ fontSize: "var(--text-display-lg)" }}
        >
          Dal primo movimento al gioco di club.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-text-muted">
          {BRAND_NAME} è la piattaforma di studio scacchistico con un coach AI in
          italiano che spiega il <em>perché</em> di ogni mossa.
        </p>
        <div className="mt-10 flex items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-md bg-text px-6 text-base font-medium text-bg transition-opacity hover:opacity-90"
          >
            Inizia ora
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-md border border-border px-6 text-base font-medium transition-colors hover:bg-surface-2"
          >
            Ho già un account
          </Link>
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-sm text-text-muted">
        © {BRAND_NAME}
      </footer>
    </div>
  );
}
