import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";
import { MoveBadge } from "@/components/analysis/MoveBadge";
import { CLASSIFICATION_ORDER } from "@/lib/games/types";

interface SectionDef {
  /** Chiave del titolo di sezione e prefisso dei termini sotto "glossary". */
  titleKey: string;
  /** Chiavi dei termini (term + def) sotto "glossary". */
  termKeys: string[];
}

/**
 * Struttura della legenda: solo chiavi i18n, i testi vivono nei messaggi.
 * Per ogni `key`: titolo `glossary.<key>.title`, termini `glossary.<key>.<termKey>.term`
 * e `glossary.<key>.<termKey>.def`.
 */
const SECTIONS: SectionDef[] = [
  {
    titleKey: "metrics",
    termKeys: ["accuracy", "tacticalRating", "streak", "pawn", "criticalArea"],
  },
  {
    titleKey: "phases",
    termKeys: ["opening", "middlegame", "endgame"],
  },
  {
    titleKey: "tactics",
    termKeys: ["fork", "pin", "skewer", "discovered", "sacrifice"],
  },
  {
    titleKey: "general",
    termKeys: ["castling", "development", "initiative", "repertoire"],
  },
];

/**
 * Legenda dei termini scacchistici per la dashboard (prompt 08).
 * Riferimento sempre a portata di mano per i principianti: spiega in parole
 * semplici i termini usati nelle statistiche, nell'analisi e nel percorso.
 */
export async function Glossary() {
  const t = await getTranslations("dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("glossary.title")}</CardTitle>
        <CardDescription>{t("glossary.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Qualità delle mosse: riusa le stesse etichette/colori dell'analisi. */}
        <details className="rounded-md border border-border bg-surface px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-text">
            {t("glossary.moveQuality")}
          </summary>
          <ul className="mt-3 space-y-1.5">
            {CLASSIFICATION_ORDER.map((k) => {
              const m = CLASSIFICATION_META[k];
              return (
                <li key={k} className="flex items-baseline gap-2 text-xs">
                  <span className="flex min-w-[6.5rem] shrink-0 items-center gap-1.5 font-medium">
                    <MoveBadge classification={k} size={15} />
                    <span style={{ color: m.color }}>{m.label}</span>
                  </span>
                  <span className="text-text-muted">{m.description}</span>
                </li>
              );
            })}
          </ul>
        </details>

        {SECTIONS.map((section) => (
          <details key={section.titleKey} className="rounded-md border border-border bg-surface px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-text">
              {t(`glossary.${section.titleKey}.title`)}
            </summary>
            <dl className="mt-3 space-y-2.5">
              {section.termKeys.map((termKey) => (
                <div key={termKey} className="text-xs">
                  <dt className="font-medium text-text">
                    {t(`glossary.${section.titleKey}.${termKey}.term`)}
                  </dt>
                  <dd className="mt-0.5 leading-snug text-text-muted">
                    {t(`glossary.${section.titleKey}.${termKey}.def`)}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
