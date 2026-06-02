import "server-only";

import { getAnthropic } from "./client";
import { DEFAULT_COACH_MODEL, AI_MAX_TOKENS, AI_TEMPERATURE } from "@/config/ai";
import {
  explainSystemPrompt,
  explainUserMessage,
  answerSystemPrompt,
  answerContextMessage,
  SYNTHESIS_SYSTEM_PROMPT,
  synthesisUserMessage,
  CLASS_SYNTHESIS_SYSTEM_PROMPT,
  classSynthesisUserMessage,
  parseSynthesis,
} from "./prompts";
import type {
  MoveFacts,
  PositionFacts,
  ChatTurn,
  UserMetrics,
  ClassMetrics,
  CoachSynthesis,
} from "./types";

/**
 * Punto unico di interazione con l'API Anthropic (costruzione prompt + chiamata
 * + parsing). Tutto ancorato ai dati del motore: il modello spiega, non calcola.
 */

/** Estrae il testo da una risposta non-streaming. */
function textOf(content: Array<{ type: string }>): string {
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// ───────────────────────── Funzione A — spiegazione mossa ─────────────────────

/** Spiegazione completa (non-streaming): usata dal batch sugli errori chiave. */
export async function explainMove(
  facts: MoveFacts,
  elo: number | null,
): Promise<string> {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: DEFAULT_COACH_MODEL,
    max_tokens: AI_MAX_TOKENS.explain,
    temperature: AI_TEMPERATURE,
    system: explainSystemPrompt(elo),
    messages: [{ role: "user", content: explainUserMessage(facts) }],
  });
  return textOf(msg.content).trim();
}

/**
 * Spiegazione in streaming (Funzione A on-demand). `onDelta` riceve i pezzi di
 * testo man mano; risolve con il testo completo (da salvare in `ai_comment`).
 */
export async function streamExplainMove(
  facts: MoveFacts,
  elo: number | null,
  onDelta: (text: string) => void,
): Promise<string> {
  const client = getAnthropic();
  let full = "";
  const stream = client.messages.stream({
    model: DEFAULT_COACH_MODEL,
    max_tokens: AI_MAX_TOKENS.explain,
    temperature: AI_TEMPERATURE,
    system: explainSystemPrompt(elo),
    messages: [{ role: "user", content: explainUserMessage(facts) }],
  });
  stream.on("text", (t) => {
    full += t;
    onDelta(t);
  });
  await stream.finalMessage();
  return full.trim();
}

// ───────────────────────── Funzione B — Q&A streaming ─────────────────────────

/**
 * Risposta in streaming a una domanda sulla posizione. Il contesto fattuale del
 * motore viene prepeso come messaggio utente; seguono le ultime battute della
 * conversazione (il modello non ha memoria tra chiamate).
 */
export async function streamAnswer(
  facts: PositionFacts,
  history: ChatTurn[],
  question: string,
  elo: number | null,
  onDelta: (text: string) => void,
): Promise<string> {
  const client = getAnthropic();

  const messages = [
    { role: "user" as const, content: answerContextMessage(facts) },
    {
      role: "assistant" as const,
      content: "Ho i dati del motore per questa posizione. Qual è la tua domanda?",
    },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: question },
  ];

  let full = "";
  const stream = client.messages.stream({
    model: DEFAULT_COACH_MODEL,
    max_tokens: AI_MAX_TOKENS.answer,
    temperature: AI_TEMPERATURE,
    system: answerSystemPrompt(elo),
    messages,
  });
  stream.on("text", (t) => {
    full += t;
    onDelta(t);
  });
  await stream.finalMessage();
  return full.trim();
}

// ───────────────────────── Funzione C — sintesi JSON ──────────────────────────

/** Sintesi dei pattern d'errore in JSON strutturato, con parse robusto. */
export async function synthesizePatterns(
  metrics: UserMetrics,
): Promise<CoachSynthesis | null> {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: DEFAULT_COACH_MODEL,
    max_tokens: AI_MAX_TOKENS.synthesis,
    temperature: AI_TEMPERATURE,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: synthesisUserMessage(metrics) }],
  });
  return parseSynthesis(textOf(msg.content));
}

/**
 * Funzione C (variante classe): sintesi dei punti deboli aggregati di una
 * classe per l'istruttore. Stesso principio "il dato è dato": le metriche sono
 * deterministiche, il modello produce solo la frase di sintesi.
 */
export async function synthesizeClass(
  metrics: ClassMetrics,
): Promise<CoachSynthesis | null> {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: DEFAULT_COACH_MODEL,
    max_tokens: AI_MAX_TOKENS.synthesis,
    temperature: AI_TEMPERATURE,
    system: CLASS_SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: classSynthesisUserMessage(metrics) }],
  });
  return parseSynthesis(textOf(msg.content));
}
