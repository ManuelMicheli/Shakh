"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { randomUUID } from "crypto";
import { ProviderError, lichessProvider, chesscomProvider } from "@/lib/games/providers";
import { splitPgn, parseGame, detectUserColor, type ParsedGame } from "@/lib/games/pgn";
import { fetchExternalRating, fetchProfileText } from "@/lib/rating/external";
import type { ExternalSource } from "@/lib/rating/calibration";
import { applyExternalRating, clearExternalRating } from "@/lib/rating/store";
import { levelFromRating } from "@/lib/path/diagnostic";
import { recomputePath, loadNodes } from "@/lib/path/recompute";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UpdateProfileInput {
  displayName: string;
  username: string;
  locale: string;
  themePreference: "dark" | "light";
}

export interface UpdateResult {
  ok: boolean;
  error?: string;
}

/** Aggiorna le impostazioni del profilo (nome, username, locale, tema preferito). */
export async function updateProfile(input: UpdateProfileInput): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please sign in again." };

  const username = input.username.trim();
  const displayName = input.displayName.trim();
  if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username))
    return { ok: false, error: "Username: 3–30 characters, letters/numbers/underscore." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      username: username || null,
      locale: input.locale,
      theme_preference: input.themePreference,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Username already taken." };
    return { ok: false, error: error.message };
  }

  // Allinea il cookie di locale così UI e formati seguono la scelta (§3).
  if (isLocale(input.locale)) {
    (await cookies()).set(LOCALE_COOKIE, input.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  revalidatePath("/app/profilo");
  return { ok: true };
}

/** Tabelle con dati personali esportabili (colonna chiave → valore user.id). */
const EXPORT_TABLES: { table: string; col: string }[] = [
  { table: "games", col: "user_id" },
  { table: "user_progress", col: "user_id" },
  { table: "user_puzzle_attempts", col: "user_id" },
  { table: "user_tactic_stats", col: "user_id" },
  { table: "tactic_rating_history", col: "user_id" },
  { table: "user_path_progress", col: "user_id" },
  { table: "content_completions", col: "user_id" },
  { table: "repertoires", col: "owner_user_id" },
  { table: "external_accounts", col: "user_id" },
];

export interface ExportResult {
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Diritto di portabilità (§1): raccoglie i dati dell'utente in un oggetto JSON.
 * RLS garantisce che si leggano solo le proprie righe; le tabelle non presenti
 * vengono semplicemente ignorate.
 */
export async function exportMyData(): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please sign in again." };

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  out.profile = profile ?? null;

  for (const { table, col } of EXPORT_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq(col, user.id);
    if (!error) out[table] = data ?? [];
  }

  return { ok: true, data: out };
}

export interface DeleteResult {
  ok: boolean;
  error?: string;
}

/**
 * Diritto all'oblio (§1): elimina l'utente da auth.users tramite service role.
 * Le FK `on delete cascade` rimuovono a cascata profilo e dati collegati.
 * Richiede conferma esplicita lato client.
 */
export async function deleteMyAccount(): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please sign in again." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }

  // Chiude la sessione locale (i cookie vengono invalidati).
  await supabase.auth.signOut();
  return { ok: true };
}

// ============================================================
// Account online collegati (Lichess / Chess.com) → dominio 'external'
// ============================================================

export interface LinkedAccount {
  source: ExternalSource;
  username: string;
  ratingNative: number | null;
  ratingOtb: number | null;
  nGames: number;
  /** True solo dopo verifica della proprietà via bio-token: solo allora incide sul rating. */
  verified: boolean;
  /** Token da inserire nella bio/profilo della piattaforma (presente solo se in attesa di verifica). */
  verifyToken: string | null;
  fetchedAt: string;
}

/** Esito del seeding post-verifica (import partite + posizionamento nel percorso). */
export interface SeedInfo {
  /** Partite scaricate e salvate (pronte per l'analisi). */
  importedGames: number;
  /** Livello del percorso assegnato dal rating verificato, o null se non riposizionato. */
  startingLevel: number | null;
}

export interface LinkResult {
  ok: boolean;
  error?: string;
  account?: LinkedAccount;
  /** Presente solo dopo una verifica andata a buon fine. */
  seed?: SeedInfo;
}

function isExternalSource(s: string): s is ExternalSource {
  return s === "lichess" || s === "chesscom";
}

/** Messaggio leggibile da un ProviderError (rete/non trovato/rate limit/insufficiente). */
function providerMessage(e: unknown): string {
  if (e instanceof ProviderError) return e.message;
  return e instanceof Error ? e.message : "Unexpected error.";
}

/** Validità del token di verifica (minuti). */
const VERIFY_TTL_MIN = 30;

/** Genera un token di verifica usa-e-getta, facile da incollare nella bio. */
function makeVerifyToken(): string {
  return `shakh-verify-${randomUUID().slice(0, 8)}`;
}

/**
 * Il dominio 'external' è UNO solo ed è alimentato SOLO da account VERIFICATI:
 * fra questi, vince quello con più partite valutate (stima più affidabile). Se
 * nessun account verificato resta, azzera il contributo.
 */
async function recomputeExternalDomain(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from("external_accounts")
    .select("rating_otb, n_games")
    .eq("user_id", userId)
    .eq("verified", true)
    .order("n_games", { ascending: false })
    .limit(1);
  const best = (data as { rating_otb: number | null; n_games: number }[] | null)?.[0];
  if (best && best.rating_otb != null) {
    await applyExternalRating(supabase, userId, best.rating_otb, best.n_games);
  } else {
    await clearExternalRating(supabase, userId);
  }
}

/** Partite recenti da scaricare al primo collegamento verificato. */
const SEED_IMPORT_MAX = 40;

/**
 * Seeding post-verifica. Una volta provata la proprietà dell'account:
 *  1. scarica le ultime partite pubbliche e le salva (dedup), pronte all'analisi;
 *  2. se l'utente non ha ancora completato l'onboarding, usa il rating OTB
 *     VERIFICATO — segnale ben più affidabile di un'autovalutazione — per stimare
 *     l'Elo, posizionarlo nel percorso (i fondamentali sotto il livello risultano
 *     già fatti) e inizializzare il rating tattico se assente.
 *
 * Tutto best-effort: un errore qui non deve far fallire la verifica. Chi non ha
 * un account o non l'ha verificato prosegue normalmente e il rating si forma dal
 * gioco sulla piattaforma.
 */
async function seedFromVerifiedAccount(
  supabase: SupabaseClient,
  userId: string,
  source: ExternalSource,
  username: string,
  otb: number | null,
): Promise<SeedInfo> {
  const info: SeedInfo = { importedGames: 0, startingLevel: null };

  // 1) Import partite recenti (best-effort).
  try {
    const provider = source === "lichess" ? lichessProvider : chesscomProvider;
    const pgnText = await provider.fetchUserGamesPgn(username, SEED_IMPORT_MAX);
    const games = splitPgn(pgnText)
      .map(parseGame)
      .filter((g): g is ParsedGame => g !== null);
    info.importedGames = await insertGamesDedup(supabase, userId, games, source, username);
  } catch {
    // ignora: l'import è un di più, non blocca la verifica
  }

  // 2) Posizionamento nel percorso dal rating verificato, solo se non onboarded.
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle<{ onboarding_completed: boolean }>();

    if (otb != null && profile && !profile.onboarding_completed) {
      const startingLevel = levelFromRating(otb);
      const tacticSeed = Math.max(600, Math.min(2200, otb));

      // Rating tattico iniziale solo se l'utente non ne ha già uno.
      const { data: stats } = await supabase
        .from("user_tactic_stats")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!stats) {
        await supabase
          .from("user_tactic_stats")
          .upsert(
            { user_id: userId, rating: tacticSeed, rating_deviation: 150 },
            { onConflict: "user_id" },
          );
      }

      await supabase
        .from("profiles")
        .update({
          elo_estimate: otb,
          current_level: startingLevel,
          onboarding_completed: true,
        })
        .eq("id", userId);

      // Fondamentali sotto il livello di partenza già completati (come l'onboarding).
      if (startingLevel > 0) {
        const nodes = await loadNodes(supabase);
        const now = new Date().toISOString();
        const skip = nodes
          .filter((n) => n.level < startingLevel)
          .map((n) => ({
            user_id: userId,
            node_id: n.id,
            status: "completed" as const,
            progress: 1,
            completed_at: now,
          }));
        if (skip.length)
          await supabase
            .from("user_path_progress")
            .upsert(skip, { onConflict: "user_id,node_id" });
      }

      await recomputePath(supabase, userId);
      info.startingLevel = startingLevel;
    }
  } catch {
    // ignora: il posizionamento è best-effort
  }

  return info;
}

/** Inserisce partite parsate deduplicando su (user_id, source, external_id). Ritorna gli inserimenti. */
async function insertGamesDedup(
  supabase: SupabaseClient,
  userId: string,
  games: ParsedGame[],
  source: ExternalSource,
  username: string,
): Promise<number> {
  if (games.length === 0) return 0;

  const extIds = games.map((g) => g.externalId).filter((x): x is string => !!x);
  const existing = new Set<string>();
  if (extIds.length > 0) {
    const { data } = await supabase
      .from("games")
      .select("external_id")
      .eq("user_id", userId)
      .eq("source", source)
      .in("external_id", extIds);
    data?.forEach((r) => r.external_id && existing.add(r.external_id as string));
  }

  const seen = new Set<string>();
  const rows = [];
  for (const g of games) {
    if (g.externalId) {
      if (existing.has(g.externalId) || seen.has(g.externalId)) continue;
      seen.add(g.externalId);
    }
    rows.push({
      user_id: userId,
      source,
      external_id: g.externalId,
      pgn: g.pgn,
      white: g.white,
      black: g.black,
      result: g.result,
      eco_code: g.ecoCode,
      user_color: detectUserColor(g, username),
      played_at: g.playedAt,
      counts_for_profile: true, // seeding da account appena verificato → partite proprie
    });
  }
  if (rows.length === 0) return 0;

  const { error } = await supabase.from("games").insert(rows);
  if (error) return 0;
  return rows.length;
}

/**
 * Passo 1 del collegamento: valida l'utente, legge il rating pubblico e registra
 * l'account come NON verificato con un token di verifica. NON tocca ancora il
 * Rating Shakh: serve prima la verifica di proprietà (`verifyExternalAccount`).
 * `username` è un dato pubblico.
 */
export async function beginLinkExternalAccount(
  source: string,
  username: string,
): Promise<LinkResult> {
  if (!isExternalSource(source)) return { ok: false, error: "Unsupported platform." };
  const handle = username.trim();
  if (!/^[a-zA-Z0-9_-]{2,30}$/.test(handle))
    return { ok: false, error: "Invalid username (2–30 characters)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please sign in again." };

  let report;
  try {
    report = await fetchExternalRating(source, handle);
  } catch (e) {
    return { ok: false, error: providerMessage(e) };
  }

  const token = makeVerifyToken();
  const now = new Date();
  const expires = new Date(now.getTime() + VERIFY_TTL_MIN * 60_000);

  const { error } = await supabase.from("external_accounts").upsert(
    {
      user_id: user.id,
      source,
      username: report.username,
      rating_native: report.representative,
      rating_otb: report.otb,
      n_games: report.nGames,
      controls: report.controls,
      verified: false,
      verify_token: token,
      verify_expires_at: expires.toISOString(),
      fetched_at: now.toISOString(),
    },
    { onConflict: "user_id,source" },
  );
  if (error) return { ok: false, error: error.message };

  // Un account ri-collegato non deve più contare finché non è ri-verificato.
  await recomputeExternalDomain(supabase, user.id);
  revalidatePath("/app/profilo");
  revalidatePath("/app");

  return {
    ok: true,
    account: {
      source,
      username: report.username,
      ratingNative: report.representative,
      ratingOtb: report.otb,
      nGames: report.nGames,
      verified: false,
      verifyToken: token,
      fetchedAt: now.toISOString(),
    },
  };
}

/**
 * Passo 2: legge il profilo pubblico della piattaforma e verifica che contenga
 * il token. Se sì, marca l'account come verificato e alimenta il Rating Shakh.
 */
export async function verifyExternalAccount(source: string): Promise<LinkResult> {
  if (!isExternalSource(source)) return { ok: false, error: "Unsupported platform." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please sign in again." };

  const { data: row } = await supabase
    .from("external_accounts")
    .select("username, verify_token, verify_expires_at, rating_native, rating_otb, n_games")
    .eq("user_id", user.id)
    .eq("source", source)
    .maybeSingle<{
      username: string;
      verify_token: string | null;
      verify_expires_at: string | null;
      rating_native: number | null;
      rating_otb: number | null;
      n_games: number;
    }>();
  if (!row) return { ok: false, error: "Account not linked." };
  if (!row.verify_token) return { ok: false, error: "No verification in progress." };
  if (row.verify_expires_at && new Date(row.verify_expires_at) < new Date())
    return { ok: false, error: "Token expired. Relink the account to generate a new one." };

  let profileText: string;
  try {
    profileText = await fetchProfileText(source, row.username);
  } catch (e) {
    return { ok: false, error: providerMessage(e) };
  }

  if (!profileText.includes(row.verify_token)) {
    return {
      ok: false,
      error: "Token not found in your profile. Save the token, wait a few seconds, then try again.",
    };
  }

  const { error } = await supabase
    .from("external_accounts")
    .update({ verified: true, verify_token: null, verify_expires_at: null })
    .eq("user_id", user.id)
    .eq("source", source);
  if (error) return { ok: false, error: error.message };

  await recomputeExternalDomain(supabase, user.id);

  // Account provato → scarica le partite e posiziona nel percorso dal rating verificato.
  const seed = await seedFromVerifiedAccount(
    supabase,
    user.id,
    source,
    row.username,
    row.rating_otb,
  );

  revalidatePath("/app/profilo");
  revalidatePath("/app");
  revalidatePath("/app/partite");
  revalidatePath("/app/percorso");

  return {
    ok: true,
    seed,
    account: {
      source,
      username: row.username,
      ratingNative: row.rating_native,
      ratingOtb: row.rating_otb,
      nGames: row.n_games,
      verified: true,
      verifyToken: null,
      fetchedAt: new Date().toISOString(),
    },
  };
}

/** Aggiorna il rating di un account già VERIFICATO (rilettura dall'API). */
export async function refreshExternalAccount(source: string): Promise<LinkResult> {
  if (!isExternalSource(source)) return { ok: false, error: "Unsupported platform." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please sign in again." };

  const { data: existing } = await supabase
    .from("external_accounts")
    .select("username, verified")
    .eq("user_id", user.id)
    .eq("source", source)
    .maybeSingle<{ username: string; verified: boolean }>();
  if (!existing) return { ok: false, error: "Account not linked." };
  if (!existing.verified) return { ok: false, error: "Verify the account first." };

  let report;
  try {
    report = await fetchExternalRating(source, existing.username);
  } catch (e) {
    return { ok: false, error: providerMessage(e) };
  }

  const now = new Date();
  const { error } = await supabase
    .from("external_accounts")
    .update({
      rating_native: report.representative,
      rating_otb: report.otb,
      n_games: report.nGames,
      controls: report.controls,
      fetched_at: now.toISOString(),
    })
    .eq("user_id", user.id)
    .eq("source", source);
  if (error) return { ok: false, error: error.message };

  await recomputeExternalDomain(supabase, user.id);
  revalidatePath("/app/profilo");
  revalidatePath("/app");

  return {
    ok: true,
    account: {
      source,
      username: report.username,
      ratingNative: report.representative,
      ratingOtb: report.otb,
      nGames: report.nGames,
      verified: true,
      verifyToken: null,
      fetchedAt: now.toISOString(),
    },
  };
}

/** Scollega un account online e azzera (o ricalcola) il dominio 'external'. */
export async function unlinkExternalAccount(source: string): Promise<UpdateResult> {
  if (!isExternalSource(source)) return { ok: false, error: "Unsupported platform." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please sign in again." };

  const { error } = await supabase
    .from("external_accounts")
    .delete()
    .eq("user_id", user.id)
    .eq("source", source);
  if (error) return { ok: false, error: error.message };

  await recomputeExternalDomain(supabase, user.id);
  revalidatePath("/app/profilo");
  revalidatePath("/app");
  return { ok: true };
}
