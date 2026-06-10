import { describe, expect, it } from "vitest";
import { detectUserColor, parseGame, splitPgn } from "./pgn";

const SCHOLAR_MATE = `[Event "Test"]
[Site "https://lichess.org/abcd1234"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[ECO "C20"]
[UTCDate "2024.01.02"]
[UTCTime "10:00:00"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

describe("splitPgn", () => {
  it("ritorna [] per testo vuoto", () => {
    expect(splitPgn("")).toEqual([]);
    expect(splitPgn("   \n  ")).toEqual([]);
  });

  it("mantiene un singolo PGN come blocco unico", () => {
    expect(splitPgn(SCHOLAR_MATE)).toHaveLength(1);
  });

  it("divide più partite su [Event", () => {
    const two = `${SCHOLAR_MATE}\n\n${SCHOLAR_MATE}`;
    const blocks = splitPgn(two);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].startsWith("[Event")).toBe(true);
    expect(blocks[1].startsWith("[Event")).toBe(true);
  });
});

describe("parseGame", () => {
  it("estrae i metadati dagli header", () => {
    const g = parseGame(SCHOLAR_MATE);
    expect(g).not.toBeNull();
    expect(g?.white).toBe("Alice");
    expect(g?.black).toBe("Bob");
    expect(g?.result).toBe("1-0");
    expect(g?.ecoCode).toBe("C20");
    expect(g?.playedAt).toBe("2024-01-02T10:00:00.000Z");
  });

  it("estrae l'id esterno dall'URL Lichess nel tag Site", () => {
    expect(parseGame(SCHOLAR_MATE)?.externalId).toBe("abcd1234");
  });

  it("ritorna null per PGN invalido", () => {
    expect(parseGame("not a pgn at all 1. zz9")).toBeNull();
  });

  it("ritorna null per PGN senza mosse", () => {
    expect(parseGame(`[Event "Empty"]\n[White "?"]\n\n*`)).toBeNull();
  });

  it("scarta i valori placeholder '?' negli header", () => {
    const g = parseGame(`[Event "Test"]\n[White "????"]\n[Black "Bob"]\n\n1. e4 e5 *`);
    expect(g?.white).toBeNull();
    expect(g?.black).toBe("Bob");
  });
});

describe("detectUserColor", () => {
  const game = parseGame(SCHOLAR_MATE)!;

  it("riconosce il colore case-insensitive", () => {
    expect(detectUserColor(game, "ALICE")).toBe("white");
    expect(detectUserColor(game, "bob")).toBe("black");
  });

  it("ritorna null per username assente o estraneo", () => {
    expect(detectUserColor(game, null)).toBeNull();
    expect(detectUserColor(game, "carol")).toBeNull();
  });
});
