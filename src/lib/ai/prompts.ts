/**
 * System prompt e costruttori dei messaggi per il coach AI.
 *
 * Cardine non negoziabile (prompt 04 §1): le valutazioni e le mosse migliori
 * nell'input sono FATTI dati dal motore, non opinioni del modello. I prompt
 * sono scritti perché il modello SPIEGHI quei dati, mai per ricalcolarli.
 */

import { phaseLabel, classificationLabel } from "./format";
import type {
  MoveFacts,
  PositionFacts,
  CoachSynthesis,
  UserMetrics,
  ClassMetrics,
} from "./types";

/** Regole comuni a ogni interazione del coach. */
const COMMON_RULES = `Sei un allenatore di scacchi esperto che parla SOLO in italiano. Sei paziente, diretto e incoraggiante.

REGOLA FERREA: le valutazioni numeriche e le mosse migliori che ricevi sono FATTI calcolati da un motore scacchistico (Stockfish). Sono dati certi: non metterli in discussione, non cambiarli, non inventarne di nuovi. Il tuo compito è SPIEGARE in parole ciò che quei numeri dicono, non ricalcolare nulla.

Non inventare linee, varianti o valutazioni che non ti sono state fornite. Non usare gergo da motore ("centipawn", "depth", "nodi"): traduci tutto in concetti scacchistici comprensibili (vantaggio, iniziativa, struttura di pedoni, re esposto, pezzo debole...). Sii conciso: spiegazioni brevi e utili, mai muri di testo.`;

/** Calibrazione opzionale sul livello dell'utente. */
function levelHint(elo: number | null): string {
  if (!elo) return "";
  if (elo < 1200)
    return "\n\nL'utente è principiante (sotto i 1200 Elo): usa parole semplici, evita nomi di aperture o tecnicismi e spiega i concetti di base.";
  if (elo < 1800)
    return "\n\nL'utente è di livello intermedio (1200–1800 Elo): puoi usare la terminologia scacchistica comune, resta concreto.";
  return "\n\nL'utente è di livello avanzato (oltre 1800 Elo): puoi essere tecnico e sintetico, va dritto al punto.";
}

// ───────────────────────── Funzione A — spiegazione mossa ─────────────────────

export function explainSystemPrompt(elo: number | null): string {
  return `${COMMON_RULES}${levelHint(elo)}

Spiegherai perché una mossa giocata è (o non è) un errore. Rispondi in 3–5 frasi, solo prosa, niente elenchi puntati.

Insieme ai dati del motore ricevi gli "effetti sulla scacchiera" della mossa giocata (ed eventualmente della mossa migliore): traiettorie aperte o chiuse, minacce nuove, pezzi lasciati in presa. Anche questi sono FATTI calcolati: la tua spiegazione deve APPOGGIARSI a essi e dire concretamente cosa la mossa cambia sulla scacchiera — quali linee apre o chiude, cosa minaccia, cosa lascia scoperto. Non limitarti al giudizio: l'utente deve capire COSA è cambiato.

Quando la mossa è un errore (imprecisione, errore, occasione mancata o errore grave) e ti viene data una mossa migliore diversa da quella giocata, la spiegazione DEVE contenere tre cose:
1. PERCHÉ la mossa giocata è sbagliata, ancorato ai suoi effetti sulla scacchiera (la traiettoria aperta all'avversario, il pezzo lasciato in presa, la tattica non vista, il vantaggio buttato);
2. QUAL È la mossa migliore, citandola esplicitamente in notazione SAN così com'è scritta nei dati;
3. COSA quella mossa migliore avrebbe cambiato sulla scacchiera (la linea aperta o chiusa, la minaccia creata o parata, il vantaggio mantenuto), usando gli effetti forniti.

Quando invece la mossa è buona o la migliore, spiega brevemente perché funziona descrivendo cosa cambia sulla scacchiera, senza inventare alternative.`;
}

export function explainUserMessage(facts: MoveFacts): string {
  const lines: string[] = [
    `Posizione (FEN, prima della mossa): ${facts.fenBefore}`,
    `Fase di gioco: ${phaseLabel(facts.phase)}`,
    `Ha mosso il ${facts.mover === "white" ? "Bianco" : "Nero"}.`,
    `Mossa giocata: ${facts.playedSan} (classificata dal motore come: ${classificationLabel(facts.classification)}).`,
  ];
  if (facts.bestMoveSan) lines.push(`Mossa migliore secondo il motore: ${facts.bestMoveSan}.`);
  if (facts.evalBeforeText && facts.evalAfterText)
    lines.push(
      `Valutazione (dal punto di vista del Bianco): da ${facts.evalBeforeText} a ${facts.evalAfterText} dopo la mossa giocata.`,
    );
  if (facts.playedEffects) {
    lines.push(
      `Effetti della mossa giocata ${facts.playedSan} sulla scacchiera (fatti calcolati):`,
      facts.playedEffects,
    );
  }
  if (facts.bestEffects && facts.bestMoveSan) {
    lines.push(
      `Effetti che avrebbe avuto la mossa migliore ${facts.bestMoveSan} (fatti calcolati):`,
      facts.bestEffects,
    );
  }

  const isError =
    facts.classification === "inaccuracy" ||
    facts.classification === "mistake" ||
    facts.classification === "miss" ||
    facts.classification === "blunder";
  const hasBetterMove =
    Boolean(facts.bestMoveSan) && facts.bestMoveSan !== facts.playedSan;

  lines.push("");
  if (isError && hasBetterMove) {
    lines.push(
      `Spiega in italiano, da allenatore: perché ${facts.playedSan} è un errore, qual era la mossa migliore (cita ${facts.bestMoveSan} esplicitamente) e cosa otteneva. Ricorda: i numeri e la mossa migliore sopra sono dati certi del motore.`,
    );
  } else {
    lines.push(
      "Spiega in italiano, da allenatore, cosa è successo. Ricorda: i numeri sopra sono dati certi del motore.",
    );
  }
  return lines.join("\n");
}

// ───────────────────────── Funzione B — Q&A sulla posizione ───────────────────

export function answerSystemPrompt(elo: number | null): string {
  return `${COMMON_RULES}${levelHint(elo)}

Rispondi alle domande dell'utente sulla posizione mostrata. Ti vengono fornite le linee migliori del motore (in notazione SAN) e le relative valutazioni: usale come base fattuale. Spiega il PIANO e il PERCHÉ in modo coerente con quelle linee. Se l'utente chiede perché una certa mossa non va bene e te ne è stata data la valutazione, spiega cosa la rende peggiore della migliore. Resta sintetico e concreto.`;
}

export function answerContextMessage(facts: PositionFacts): string {
  const lines: string[] = [
    `Posizione corrente (FEN): ${facts.fen}`,
    `Tratto al ${facts.turn === "w" ? "Bianco" : "Nero"}.`,
  ];
  if (facts.lines.length > 0) {
    lines.push("Linee migliori del motore (valutazione dal punto di vista del Bianco):");
    facts.lines.forEach((l, i) => {
      lines.push(`  ${i + 1}) ${l.evalText} — ${l.pvSan.join(" ")}`);
    });
  }
  if (facts.askedMove) {
    lines.push(
      `Valutazione della mossa ${facts.askedMove.san} citata nella domanda: ${facts.askedMove.evalText}${
        facts.askedMove.isBest ? " (è anche la mossa migliore)" : ""
      }.`,
    );
  }
  lines.push("", "Questi sono dati certi del motore: spiegali, non ricalcolarli.");
  return lines.join("\n");
}

// ───────────────────────── Funzione C — sintesi pattern ───────────────────────

export const SYNTHESIS_SYSTEM_PROMPT = `${COMMON_RULES}

Riceverai metriche aggregate (già calcolate) sugli errori di un giocatore nelle sue partite. Devi produrre una sintesi motivante e azionabile dei suoi punti deboli ricorrenti.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo prima o dopo, senza markdown, senza blocchi di codice. Schema esatto:
{"summary": "2-3 frasi che riassumono i punti deboli principali", "focusAreas": ["area 1", "area 2"], "suggestion": "un consiglio concreto su cosa allenare"}

Le metriche sono fatti: basa la sintesi solo su di esse, non inventare numeri.`;

export function synthesisUserMessage(m: UserMetrics): string {
  const phaseLines = m.byPhase
    .map(
      (p) =>
        `  - ${phaseLabel(p.phase)}: ${p.moves} mosse, ${p.inaccuracies} imprecisioni, ${p.mistakes} errori, ${p.blunders} gravi errori (qualità ${(p.score * 100).toFixed(0)}%)`,
    )
    .join("\n");
  return [
    `Partite analizzate: ${m.games}. Mosse del giocatore esaminate: ${m.userMoves}.`,
    `Totali — imprecisioni: ${m.inaccuracies}, errori: ${m.mistakes}, gravi errori: ${m.blunders}.`,
    "Errori per fase di gioco:",
    phaseLines || "  (dati insufficienti)",
    m.worstPhase ? `Fase più debole: ${phaseLabel(m.worstPhase)}.` : "",
    "",
    "Produci ora il JSON della sintesi.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─────────────────── Funzione C (variante classe) — sintesi istruttore ────────

export const CLASS_SYNTHESIS_SYSTEM_PROMPT = `${COMMON_RULES}

Riceverai metriche AGGREGATE (già calcolate) sui punti deboli di una CLASSE di allievi: competenza media per area e punti deboli condivisi da più allievi. Devi produrre per l'istruttore una sintesi in italiano, utile a pianificare le lezioni.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo prima o dopo, senza markdown, senza blocchi di codice. Schema esatto:
{"summary": "2-3 frasi sul livello generale della classe e i punti deboli comuni", "focusAreas": ["area 1", "area 2"], "suggestion": "una proposta concreta di lezione/attività per la classe"}

Le metriche sono fatti aggregati: basa la sintesi solo su di esse, non inventare numeri né nomi di allievi.`;

export function classSynthesisUserMessage(m: ClassMetrics): string {
  const areaLines = m.areas
    .map(
      (a) =>
        `  - ${a.label}: competenza media ${a.avgScore == null ? "n/d" : `${(a.avgScore * 100).toFixed(0)}%`} (${a.studentsWithData} allievi con dati)`,
    )
    .join("\n");
  const weakLines = m.commonWeaknesses
    .map((w) => `  - ${w.label}: debole in ${w.count} allievi`)
    .join("\n");
  return [
    `Allievi nella classe: ${m.studentCount}.`,
    "Competenza media per area:",
    areaLines || "  (dati insufficienti)",
    "Punti deboli condivisi:",
    weakLines || "  (nessun punto debole comune marcato)",
    "",
    "Produci ora il JSON della sintesi di classe.",
  ].join("\n");
}

/**
 * Parse robusto della risposta di sintesi: il modello dovrebbe dare solo JSON,
 * ma gestiamo eventuali sbavature (testo extra, blocchi markdown).
 */
export function parseSynthesis(raw: string): CoachSynthesis | null {
  let text = raw.trim();
  // Rimuovi eventuali recinzioni markdown ```json ... ```.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Isola il primo oggetto JSON bilanciato.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  const slice = text.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice) as Partial<CoachSynthesis>;
    if (typeof obj.summary !== "string") return null;
    return {
      summary: obj.summary,
      focusAreas: Array.isArray(obj.focusAreas)
        ? obj.focusAreas.filter((x): x is string => typeof x === "string")
        : [],
      suggestion: typeof obj.suggestion === "string" ? obj.suggestion : "",
    };
  } catch {
    return null;
  }
}
