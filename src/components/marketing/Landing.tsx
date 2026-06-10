"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BRAND_NAME } from "@/config/brand";
import { BrandMark } from "@/components/layout/BrandMark";
import { InstallButton } from "@/components/pwa/InstallButton";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

/** Animazione di rivelazione allo scroll, sobria (no rimbalzi). */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Landing() {
  const t = useTranslations("landing");
  const c = useTranslations("common");

  const features = [
    { title: t("featAnalysisTitle"), body: t("featAnalysisBody"), n: "01" },
    { title: t("featPathTitle"), body: t("featPathBody"), n: "02" },
    { title: t("featTheoryTitle"), body: t("featTheoryBody"), n: "03" },
    { title: t("featTacticsTitle"), body: t("featTacticsBody"), n: "04" },
    { title: t("featTrapsTitle"), body: t("featTrapsBody"), n: "05" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-bg/80 px-6 backdrop-blur md:px-10">
        <span className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <BrandMark className="h-5 w-5 shrink-0" />
          {BRAND_NAME}
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <InstallButton className="hidden h-9 px-3 text-sm sm:inline-flex" />
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-text-muted transition-colors hover:text-text"
          >
            {c("login")}
          </Link>
          <Link
            href="/signup"
            className="cut-45 btn-wipe inline-flex h-9 items-center bg-accent px-4 text-sm font-semibold text-accent-contrast"
          >
            {t("navCta")}
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 md:px-10 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
              {t("heroKicker")}
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1
              className="mt-6 max-w-4xl font-display font-semibold leading-[1.02] tracking-tight"
              style={{ fontSize: "var(--text-display-lg)" }}
            >
              {t("heroTitle")}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-text-muted">
              {t.rich("heroSub", { em: (ch) => <em className="text-text">{ch}</em> })}
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="cut-45 btn-wipe inline-flex h-12 items-center justify-center bg-accent px-7 text-base font-semibold text-accent-contrast"
              >
                {t("heroCtaPrimary")}
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md border border-border px-7 text-base font-medium transition-colors hover:bg-surface-2"
              >
                {t("heroCtaSecondary")}
              </Link>
              <InstallButton className="h-12 px-7 text-base" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* COME FUNZIONA */}
      <section className="border-t border-border px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2
              className="font-display font-semibold tracking-tight"
              style={{ fontSize: "var(--text-display-sm)" }}
            >
              {t("howTitle")}
            </h2>
            <p className="mt-3 max-w-xl text-text-muted">{t("howSub")}</p>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.n} delay={(i % 3) * 0.05} className="bg-bg">
                <div className="flex h-full flex-col p-7">
                  <span className="font-mono text-xs text-text-muted">{f.n}</span>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {f.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COACH — angolo differenziante */}
      <section className="border-t border-border px-6 py-28 md:px-10">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
              {t("coachKicker")}
            </span>
            <h2
              className="mt-6 font-display font-semibold leading-[1.05] tracking-tight"
              style={{ fontSize: "var(--text-display-md)" }}
            >
              {t("coachTitle")}
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-text-muted">
              {t("coachBody")}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-lg border border-border bg-surface p-7">
              <ul className="space-y-5">
                {[t("coachPoint1"), t("coachPoint2"), t("coachPoint3")].map(
                  (p, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="font-mono text-sm text-text-muted">
                        0{i + 1}
                      </span>
                      <span className="text-sm leading-relaxed">{p}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA FINALE */}
      <section className="border-t border-border px-6 py-28 text-center md:px-10">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <h2
              className="font-display font-semibold tracking-tight"
              style={{ fontSize: "var(--text-display-md)" }}
            >
              {t("finalTitle")}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-text-muted">{t("finalSub")}</p>
            <Link
              href="/signup"
              className="cut-45 btn-wipe mt-10 inline-flex h-12 items-center justify-center bg-accent px-8 text-base font-semibold text-accent-contrast"
            >
              {t("finalCta")}
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
