/**
 * Partite indimenticabili: i capolavori più celebri della storia degli
 * scacchi, con mosse verificate contro fonti autorevoli (Wikipedia,
 * database storici) e validate con chess.js (`scripts/validate-famous.ts`).
 *
 * `annotations` è indicizzata per semimossa 0-based (= cursore di
 * `useChessGame`): il commento resta visibile finché non ne arriva uno nuovo.
 * I commenti usano la SAN inglese (Bd6, Qf6+) come il resto del prodotto.
 */

export interface FamousGame {
  slug: string;
  /** Nome con cui la partita è passata alla storia. */
  title: string;
  white: string;
  black: string;
  event: string;
  year: number;
  result: "1-0" | "0-1" | "1/2-1/2";
  eco?: string;
  /** Gancio di una riga per la card nella lista. */
  highlight: string;
  /** Contesto storico, mostrato sulla posizione iniziale. */
  intro: string;
  /** Solo movetext SAN, senza header PGN. */
  pgn: string;
  annotations: Record<number, string>;
}

export const FAMOUS_GAMES: FamousGame[] = [
  {
    slug: "immortale",
    title: "L'Immortale",
    white: "Adolf Anderssen",
    black: "Lionel Kieseritzky",
    event: "Londra 1851 · partita libera",
    year: 1851,
    result: "1-0",
    eco: "C33",
    highlight:
      "Anderssen sacrifica alfiere, entrambe le torri e la donna: matto con i tre pezzi minori rimasti.",
    intro:
      "Londra, 21 giugno 1851: una partita libera giocata a margine del primo grande torneo internazionale della storia. Anderssen offre un alfiere, due torri e la donna per dare matto con i soli pezzi minori. È il manifesto dell'epoca romantica degli scacchi.",
    pgn: "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0",
    annotations: {
      2: "Gambetto di Re: il Bianco offre subito un pedone per aprire la colonna f e prendere l'iniziativa. Era l'apertura simbolo dell'Ottocento romantico.",
      5: "Lo scacco toglie l'arrocco al Bianco… ma il re in f1 si rivelerà sorprendentemente al sicuro, mentre la donna nera comincia un lungo girovagare.",
      7: "4...b5, il controgambetto Bryan: il Nero devia l'alfiere per guadagnare tempi contro la donna bianca.",
      20: "11.Rg1! Anderssen lascia l'alfiere in presa: il tempo vale più del materiale. Da qui in poi ogni mossa bianca crea una minaccia.",
      26: "La donna nera è stata rincorsa per mezza scacchiera. Bilancio: il Bianco ha quasi tutti i pezzi in gioco, il Nero ha mosso quasi solo la donna.",
      34: "18.Bd6!! Inizia la combinazione immortale: il Bianco offre entrambe le torri. Accettarle costa al Nero ogni residua coordinazione.",
      37: "Il Nero ha mangiato tutto: alfiere e due torri, con scacco. Ma i suoi pezzi dormono ancora sull'ottava traversa, e tocca al Bianco.",
      42: "22.Qf6+!! Il sacrificio di donna che consegna la partita alla storia: forza il matto alla mossa successiva.",
      44: "23.Be7#. Matto con i tre pezzi minori rimasti — due cavalli e un alfiere — mentre quasi tutto l'esercito nero guarda da lontano.",
    },
  },
  {
    slug: "sempreverde",
    title: "La Sempreverde",
    white: "Adolf Anderssen",
    black: "Jean Dufresne",
    event: "Berlino 1852 · partita libera",
    year: 1852,
    result: "1-0",
    eco: "C52",
    highlight:
      "Sacrificio di torre e di donna in due mosse: la batteria di alfieri chiude una combinazione perfetta.",
    intro:
      "Berlino 1852. Un anno dopo l'Immortale, Anderssen firma il suo secondo capolavoro contro Jean Dufresne. Steinitz la definì «la sempreverde nella corona d'alloro di Anderssen»: una combinazione finale studiata ancora oggi.",
    pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7# 1-0",
    annotations: {
      6: "4.b4, il Gambetto Evans: un pedone per guadagnare tempi sull'alfiere e costruire un grande centro. L'apertura di moda dell'epoca.",
      13: "7...d3 restituisce il pedone per tenere chiusa la diagonale del Bianco e rallentarne lo sviluppo.",
      20: "11.Ba3! L'alfiere punta e7 e inchioda il re nero al centro: il Nero non riuscirà più ad arroccare.",
      32: "17.Nf6+!? Anderssen apre la colonna g del Nero… che diventerà proprio la base del contrattacco nero su g2. Il gioco si fa doppio filo.",
      35: "18...Rg8: il Nero minaccia ...Qxf3 e matto su g2. Sembra che l'attacco nero arrivi per primo.",
      36: "19.Rad1!! La mossa più discussa della storia: invece di difendersi, il Bianco prepara una combinazione più profonda dell'attacco avversario.",
      37: "19...Qxf3? Il Nero prende il cavallo e minaccia matto in una. Ma ora tocca al Bianco, e ogni sua mossa sarà uno scacco.",
      38: "20.Rxe7+! Primo sacrificio: la torre elimina il difensore e apre la strada alla donna.",
      40: "21.Qxd7+!! Il sacrificio di donna: il re nero è costretto a una marcia fatale sotto i colpi della batteria di alfieri.",
      46: "24.Bxe7#. I due alfieri e la torre in d1 — piazzata cinque mosse prima — coordinano il matto. Tutto era stato calcolato da 19.Rad1.",
    },
  },
  {
    slug: "partita-dell-opera",
    title: "La Partita dell'Opera",
    white: "Paul Morphy",
    black: "Duca di Brunswick e Conte Isouard",
    event: "Opera di Parigi 1858 · consultazione",
    year: 1858,
    result: "1-0",
    eco: "C41",
    highlight:
      "Diciassette mosse perfette tra un atto e l'altro: la lezione definitiva su sviluppo e iniziativa.",
    intro:
      "Parigi, 1858. Durante una rappresentazione all'Opera, il Duca di Brunswick e il Conte Isouard sfidano in consultazione Paul Morphy, che vorrebbe solo guardare lo spettacolo. Ne esce la più famosa lezione di sviluppo della storia: ogni mossa bianca crea una minaccia.",
    pgn: "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0",
    annotations: {
      5: "3...Bg4? viola un principio: muove un pezzo che sarà costretto a cambiarsi, regalando al Bianco tempo e la coppia degli alfieri.",
      12: "7.Qb3 attacca f7 e b7 insieme. Il Nero deve già difendersi con mosse passive.",
      14: "8.Nc3! Morphy rinuncia a vincere un pedone (Qxb7) e preferisce un altro pezzo sviluppato. Sviluppo prima del materiale: il tema della partita.",
      18: "10.Nxb5! Il sacrificio di cavallo apre le linee verso il re nero rimasto al centro.",
      22: "12.O-O-O: l'arrocco lungo porta la torre in gioco con tempo sull'inchiodatura in d7. Tutti i pezzi bianchi partecipano, nessun pezzo nero respira.",
      24: "13.Rxd7! Morphy liquida il difensore: la semplificazione come arma d'attacco.",
      30: "16.Qb8+!! Il colpo finale: la donna si sacrifica per deviare il cavallo e liberare d8.",
      32: "17.Rd8#. Matto con torre e alfiere, in 17 mosse. Da studiare a memoria: è il modello di come punire lo sviluppo arretrato.",
    },
  },
  {
    slug: "steinitz-von-bardeleben",
    title: "La torre imprendibile",
    white: "Wilhelm Steinitz",
    black: "Curt von Bardeleben",
    event: "Hastings 1895 · turno 10",
    year: 1895,
    result: "1-0",
    eco: "C54",
    highlight:
      "La torre bianca danza in settima tra i pezzi neri: in presa per quattro mosse, imprendibile per tattica.",
    intro:
      "Hastings 1895, il torneo più forte dell'Ottocento. Steinitz, primo campione del mondo ormai a fine carriera, costruisce una combinazione in cui la sua torre resta in presa per quattro mosse consecutive senza poter mai essere catturata. Von Bardeleben non resse: lasciò la sala senza abbandonare, e Steinitz dimostrò al pubblico il matto forzato in dieci mosse.",
    pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Bg5 Be7 11. Bxd5 Bxd5 12. Nxd5 Qxd5 13. Bxe7 Nxe7 14. Re1 f6 15. Qe2 Qd7 16. Rac1 c6 17. d5 cxd5 18. Nd4 Kf7 19. Ne6 Rhc8 20. Qg4 g6 21. Ng5+ Ke8 22. Rxe7+ Kf8 23. Rf7+ Kg8 24. Rg7+ Kh8 25. Rxh7+ 1-0",
    annotations: {
      26: "Il re nero è rimasto al centro: 14.Re1 lo inchioda lì. Tutta la partita di Steinitz ruota su questo bersaglio.",
      32: "17.d5! Rottura centrale: il pedone si sacrifica per aprire la posizione mentre il re nero è ancora in mezzo.",
      36: "19.Ne6! Il cavallo si installa nel cuore della posizione nera: non può essere preso per la forchetta su c7.",
      40: "21.Ng5+: inizia la sequenza forzata. Ogni pezzo nero è legato alla difesa, e ora la torre bianca entra in settima.",
      42: "22.Rxe7+!! La torre è in presa di re e donna, eppure imprendibile: Kxe7 perde la donna con scacco, Qxe7 permette Rxc8+ con matto a seguire.",
      44: "23.Rf7+: la torre continua la danza in settima. Non può essere catturata: il tema di deviazione si ripete a ogni mossa.",
      48: "25.Rxh7+. Qui von Bardeleben lasciò la sala senza stringere la mano. Steinitz mostrò il matto forzato: 25...Kg8 26.Rg7+ Kh8 27.Qh4+ Kxg7 28.Qh7+ Kf8 29.Qh8+ Ke7 30.Qg7+ Ke8 31.Qg8+ Ke7 32.Qf7+ Kd8 33.Qf8+ Qe8 34.Nf7+ Kd7 35.Qd6#.",
    },
  },
  {
    slug: "rubinstein-immortale",
    title: "L'Immortale di Rubinstein",
    white: "Georg Rotlewi",
    black: "Akiba Rubinstein",
    event: "Łódź 1907",
    year: 1907,
    result: "0-1",
    eco: "D32",
    highlight:
      "Rxc3!!, Rd2!!, Rh3!!: tre colpi di torre con donna e torre in presa, geometria pura.",
    intro:
      "Łódź, dicembre 1907. Da una posizione quasi simmetrica, Rubinstein — il più grande giocatore a non aver mai disputato un match mondiale — scatena la combinazione considerata da molti la più bella di sempre: lascia donna e torre in presa e vince con pura geometria.",
    pgn: "1. d4 d5 2. Nf3 e6 3. e3 c5 4. c4 Nc6 5. Nc3 Nf6 6. dxc5 Bxc5 7. a3 a6 8. b4 Bd6 9. Bb2 O-O 10. Qd2 Qe7 11. Bd3 dxc4 12. Bxc4 b5 13. Bd3 Rd8 14. Qe2 Bb7 15. O-O Ne5 16. Nxe5 Bxe5 17. f4 Bc7 18. e4 Rac8 19. e5 Bb6+ 20. Kh1 Ng4 21. Be4 Qh4 22. g3 Rxc3 23. gxh4 Rd2 24. Qxd2 Bxe4+ 25. Qg2 Rh3 0-1",
    annotations: {
      18: "10.Qd2? Una perdita di tempo: la posizione è quasi simmetrica, ma il Nero ha ora un tempo di vantaggio. Rubinstein lo convertirà in attacco.",
      29: "15...Ne5: il Nero gioca la stessa struttura del Bianco, ma con un tempo in più. Le due diagonali b7–g2 e b6–g1 puntano già al re bianco.",
      36: "19.e5? Il Bianco attacca, ma apre la diagonale al proprio re: 19...Bb6+ arriva con guadagno di tempo.",
      39: "20...Ng4! Tutte le forze nere convergono sul re: minaccia ...Qh4 con attacco doppio su h2.",
      41: "21...Qh4: la donna entra. Il Bianco si difende con 22.g3, convinto di tenere tutto. Sta per scoprire il contrario.",
      43: "22...Rxc3!! Primo colpo: la torre si sacrifica con la donna ancora in presa. 23.gxh4 sembra vincere un pezzo…",
      45: "23...Rd2!! Secondo colpo: la torre va in presa di donna. Ogni cattura bianca apre una rete di matto diversa.",
      47: "24...Bxe4+: con la donna in meno, il Nero domina le diagonali lunghe. Il re bianco non ha più difensori.",
      49: "25...Rh3!! Terzo colpo: il matto con ...Rxh2# è imparabile. Donna e due torri sacrificate o lasciate in presa: l'Immortale di Rubinstein.",
    },
  },
  {
    slug: "monete-d-oro",
    title: "La pioggia di monete d'oro",
    white: "Stepan Levitsky",
    black: "Frank Marshall",
    event: "Breslavia 1912 · Congresso DSB",
    year: 1912,
    result: "0-1",
    highlight:
      "Qg3!!: la donna si offre a tre catture diverse, e tutte e tre perdono. La mossa più spettacolare di sempre?",
    intro:
      "Breslavia, 20 luglio 1912. La leggenda vuole che dopo la mossa finale gli spettatori abbiano coperto la scacchiera di monete d'oro. L'aneddoto è dibattuto; la mossa no: 23...Qg3!! può essere catturata in tre modi, e ognuno dei tre perde all'istante.",
    pgn: "1. d4 e6 2. e4 d5 3. Nc3 c5 4. Nf3 Nc6 5. exd5 exd5 6. Be2 Nf6 7. O-O Be7 8. Bg5 O-O 9. dxc5 Be6 10. Nd4 Bxc5 11. Nxe6 fxe6 12. Bg4 Qd6 13. Bh3 Rae8 14. Qd2 Bb4 15. Bxf6 Rxf6 16. Rad1 Qc5 17. Qe2 Bxc3 18. bxc3 Qxc3 19. Rxd5 Nd4 20. Qh5 Ref8 21. Re5 Rh6 22. Qg5 Rxh3 23. Rc5 Qg3 0-1",
    annotations: {
      22: "12.Bg4: il Bianco perde tempo a molestare i pezzi neri invece di completare lo sviluppo. Marshall accumula piccoli vantaggi.",
      35: "18...Qxc3: il Nero vince un pedone e attiva la donna. La colonna f e la diagonale verso il re bianco sono già sue.",
      37: "19...Nd4! Il cavallo entra con tempo sulla donna. Tutti i pezzi neri convergono sul re bianco.",
      41: "21...Rh6: la torre si unisce all'attacco sulla colonna h. Il Bianco è già senza difesa coordinata.",
      43: "22...Rxh3! Elimina l'alfiere difensore: 23.gxh3 perde per 23...Nf3+ con forchetta su re e donna.",
      45: "23...Qg3!! La donna in presa di due pedoni e della donna: 24.hxg3 Ne2#; 24.fxg3 Ne2+ 25.Kh1 Rxf1#; 24.Qxg3 Ne2+ e il Nero vince la donna. Levitsky abbandona.",
    },
  },
  {
    slug: "partita-del-secolo",
    title: "La Partita del Secolo",
    white: "Donald Byrne",
    black: "Bobby Fischer",
    event: "New York 1956 · Rosenwald Memorial",
    year: 1956,
    result: "0-1",
    eco: "D92",
    highlight:
      "Fischer, 13 anni, sacrifica la donna con 17...Be6!! e vince con un mulinello di scacchi di scoperta.",
    intro:
      "New York, 17 ottobre 1956. Bobby Fischer ha tredici anni e gioca contro uno dei più forti maestri americani. Il sacrificio di donna 17...Be6!! e il mulinello che segue resero la partita immediatamente leggendaria: Hans Kmoch la battezzò «la partita del secolo».",
    pgn: "1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1",
    annotations: {
      20: "11.Bg5? Byrne muove due volte lo stesso pezzo trascurando lo sviluppo. Fischer punisce all'istante.",
      21: "11...Na4!! Il colpo del tredicenne: se 12.Nxa4 segue 12...Nxe4 e il Bianco crolla su g5 e c3. Inizia la combinazione.",
      25: "13...Nxe4! Secondo colpo: il cavallo non si può prendere bene, e il centro bianco evapora.",
      33: "17...Be6!! Il sacrificio di donna. Fischer lascia la donna in presa: ha visto che torre, due alfieri e il mulinello valgono di più.",
      34: "18.Bxb6 accetta. Ora 18...Bxc4+ e il mulinello di scacchi di scoperta raccoglie materiale a ogni giro.",
      37: "Il mulinello: il cavallo mangia con scacco di scoperta dell'alfiere in c4. Il Bianco può solo assistere.",
      49: "25...Nxd1: bilancio finale del mulinello — torre, due alfieri e un pedone per la donna. E i pezzi neri dominano.",
      81: "41...Rc2#. La rete di matto con torre, alfieri e cavallo si chiude sul re in c1. Una partita perfetta a tredici anni.",
    },
  },
  {
    slug: "nezhmetdinov-immortale",
    title: "Il capolavoro di Nezhmetdinov",
    white: "Lev Polugaevsky",
    black: "Rashid Nezhmetdinov",
    event: "Soči 1958 · Campionato RSFSR",
    year: 1958,
    result: "0-1",
    highlight:
      "24...Rxf4!!: la donna resta in presa, il re bianco viene trascinato fino in a5 e mattato dalla rete nera.",
    intro:
      "Soči 1958. Rashid Nezhmetdinov, cinque volte campione russo e attaccante leggendario, lascia la propria donna in presa per due mosse e trascina il re di Polugaevsky — futuro candidato al mondiale — dalla prima traversa fino in a5, dentro una rete di matto. Considerata da molti la più bella partita d'attacco mai giocata.",
    pgn: "1. d4 Nf6 2. c4 d6 3. Nc3 e5 4. e4 exd4 5. Qxd4 Nc6 6. Qd2 g6 7. b3 Bg7 8. Bb2 O-O 9. Bd3 Ng4 10. Nge2 Qh4 11. Ng3 Nge5 12. O-O f5 13. f3 Bh6 14. Qd1 f4 15. Nge2 g5 16. Nd5 g4 17. g3 fxg3 18. hxg3 Qh3 19. f4 Be6 20. Bc2 Rf7 21. Kf2 Qh2+ 22. Ke3 Bxd5 23. cxd5 Nb4 24. Rh1 Rxf4 25. Rxh2 Rf3+ 26. Kd4 Bg7 27. a4 c5+ 28. dxc6 bxc6 29. Bd3 Nexd3+ 30. Kc4 d5+ 31. exd5 cxd5+ 32. Kb5 Rb8+ 33. Ka5 Nc6+ 0-1",
    annotations: {
      23: "12...f5: il Nero apre la colonna f e punta tutto sull'attacco al re. Lo stile Nezhmetdinov in una mossa.",
      35: "18...Qh3: la donna si infila a un passo dal re bianco. Polugaevsky decide di scacciarla… spingendo i propri pedoni davanti al re.",
      41: "21...Qh2+: il re bianco è costretto a salire. 22.Ke3 sembra coraggioso, ma da qui inizia la marcia fatale.",
      47: "24...Rxf4!! La mossa immortale: il Nero lascia la propria donna in presa in h2 e sacrifica anche la torre. La rete sul re vale più di tutto.",
      49: "25...Rf3+: il re deve avanzare ancora — 26.Kd4, in pieno centro, con tutta l'armata nera intorno.",
      51: "26...Bg7! Mossa silenziosa con il re avversario in d4: riattiva l'alfiere e prepara la rete di matto. Il Bianco non ha mosse utili.",
      59: "30...d5+: i pedoni neri spingono il re sempre più in là. Ogni scacco lo allontana di un'altra casa da casa sua.",
      65: "33...Nc6+. Il re bianco è arrivato in a5, e il matto è inevitabile. Polugaevsky abbandona: il re ha attraversato sette traverse per morire.",
    },
  },
  {
    slug: "fischer-spassky-1972",
    title: "La perfezione di Reykjavík",
    white: "Bobby Fischer",
    black: "Boris Spassky",
    event: "Reykjavík 1972 · Mondiale, partita 6",
    year: 1972,
    result: "1-0",
    eco: "D59",
    highlight:
      "La partita più pura del match del secolo: alla resa, anche Spassky applaudì.",
    intro:
      "Reykjavík, 23 luglio 1972, sesta partita del «match del secolo». Fischer apre per la prima volta in vita sua con 1.c4 e gioca una Donna Rifiutata di precisione assoluta. Alla fine il pubblico applaudì — e, secondo i testimoni, applaudì anche Spassky.",
    pgn: "1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4 1-0",
    annotations: {
      0: "1.c4: Fischer, il giocatore di 1.e4 per eccellenza, sorprende il campione del mondo alla prima mossa.",
      13: "La variante Tartakower della Donna Rifiutata: una delle difese più solide di Spassky, che non l'aveva mai persa.",
      38: "20.e4! La rottura: Fischer fissa il pedone debole in d4 e apre le linee. Da qui in poi il piano bianco scorre senza un'incertezza.",
      50: "26.f5! Inizia l'attacco diretto: la colonna f si apre e le torri bianche entrano in gioco.",
      60: "31.e6: il cuneo soffoca la posizione nera. Il Nero può solo aspettare, e Fischer migliora ogni pezzo con calma totale.",
      74: "38.Rxf6! La demolizione finale: la difesa del re nero viene smontata pezzo per pezzo.",
      80: "41.Qf4: minaccia Rf8+ e il crollo. Spassky abbandona — e si unisce all'applauso. Per molti è la partita posizionale perfetta.",
    },
  },
  {
    slug: "cavallo-polpo",
    title: "Il cavallo polpo",
    white: "Anatolij Karpov",
    black: "Garri Kasparov",
    event: "Mosca 1985 · Mondiale, partita 16",
    year: 1985,
    result: "0-1",
    eco: "B44",
    highlight:
      "Un cavallo piantato in d3 paralizza l'intera posizione di Karpov: il «polpo» più famoso della storia.",
    intro:
      "Mosca, 15 ottobre 1985, sedicesima partita del secondo match Karpov–Kasparov. Kasparov sacrifica un pedone in apertura — preparazione di casa — e pianta un cavallo in d3, nel cuore della posizione bianca: il celebre «polpo», che paralizza Karpov per venti mosse. Vinta questa, Kasparov sarebbe diventato il più giovane campione del mondo.",
    pgn: "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6 5. Nb5 d6 6. c4 Nf6 7. N1c3 a6 8. Na3 d5 9. cxd5 exd5 10. exd5 Nb4 11. Be2 Bc5 12. O-O O-O 13. Bf3 Bf5 14. Bg5 Re8 15. Qd2 b5 16. Rad1 Nd3 17. Nab1 h6 18. Bh4 b4 19. Na4 Bd6 20. Bg3 Rc8 21. b3 g5 22. Bxd6 Qxd6 23. g3 Nd7 24. Bg2 Qf6 25. a3 a5 26. axb4 axb4 27. Qa2 Bg6 28. d6 g4 29. Qd2 Kg7 30. f3 Qxd6 31. fxg4 Qd4+ 32. Kh1 Nf6 33. Rf4 Ne4 34. Qxd3 Nf2+ 35. Rxf2 Bxd3 36. Rfd2 Qe3 37. Rxd3 Rc1 38. Nb2 Qf2 39. Nd2 Rxd1+ 40. Nxd1 Re1+ 0-1",
    annotations: {
      15: "8...d5! Il gambetto preparato in casa: Kasparov dà un pedone per attività e case forti. Karpov accetta ed entra nella preparazione avversaria.",
      31: "16...Nd3! Ecco il polpo: il cavallo si pianta in d3, protetto dal pedone b4 che arriverà, e taglia la posizione bianca in due. I pezzi di Karpov non hanno più case.",
      41: "21...g5! Con il polpo in d3 che paralizza tutto, Kasparov avanza su entrambe le ali. Il Bianco non ha controgioco da nessuna parte.",
      67: "34...Nf2+! La combinazione finale: il secondo cavallo entra con forchetta. La posizione bianca, paralizzata per venti mosse, crolla in poche case.",
      79: "40...Re1+: il Bianco perde la donna o subisce matto. Karpov abbandona. Una delle vittorie strategiche più celebri del Novecento.",
    },
  },
  {
    slug: "la-marcia-del-re",
    title: "La marcia del re",
    white: "Nigel Short",
    black: "Jan Timman",
    event: "Tilburg 1991 · Interpolis",
    year: 1991,
    result: "1-0",
    eco: "B04",
    highlight:
      "Kg3–Kf4–Kg5: con le donne in scacchiera, il re bianco marcia verso h6 per dare matto di persona.",
    intro:
      "Tilburg 1991. Con le donne ancora sulla scacchiera, Nigel Short trova un'idea unica ai massimi livelli: il suo re lascia il rifugio e marcia — Kh2, Kg3, Kf4, Kg5 — verso h6, dove sosterrà personalmente il matto. Timman può solo guardare.",
    pgn: "1. e4 Nf6 2. e5 Nd5 3. d4 d6 4. Nf3 g6 5. Bc4 Nb6 6. Bb3 Bg7 7. Qe2 Nc6 8. O-O O-O 9. h3 a5 10. a4 dxe5 11. dxe5 Nd4 12. Nxd4 Qxd4 13. Re1 e6 14. Nd2 Nd5 15. Nf3 Qc5 16. Qe4 Qb4 17. Bc4 Nb6 18. b3 Nxc4 19. bxc4 Re8 20. Rd1 Qc5 21. Qh4 b6 22. Be3 Qc6 23. Bh6 Bh8 24. Rd8 Bb7 25. Rad1 Bg7 26. R8d7 Rf8 27. Bxg7 Kxg7 28. R1d4 Rae8 29. Qf6+ Kg8 30. h4 h5 31. Kh2 Rc8 32. Kg3 Rce8 33. Kf4 Bc8 34. Kg5 1-0",
    annotations: {
      46: "24.Rd8! L'infiltrazione: le torri bianche entrano in settima e ottava, e il Nero resta passivo.",
      56: "29.Qf6+! La donna si installa in f6, inattaccabile. Il re nero è chiuso, ma come dare matto? Serve un altro pezzo… e ne resta solo uno.",
      60: "31.Kh2!! Inizia la marcia: il piano è portare il re in h6, dove minaccerà Qg7#. Nessun pezzo nero può impedirlo.",
      62: "32.Kg3: seconda tappa. Il Nero non ha scacchi utili: ogni sua mossa attiva è coperta.",
      64: "33.Kf4: il re attraversa la scacchiera a donne presenti. Timman non può fare nulla: i suoi pezzi sono spettatori.",
      66: "34.Kg5: Timman abbandona. Il re arriverà in h6 e Qg7# è imparabile. Il re come pezzo d'attacco nel mediogioco: unico nel suo genere.",
    },
  },
  {
    slug: "deep-blue-kasparov",
    title: "L'uomo e la macchina",
    white: "Deep Blue",
    black: "Garri Kasparov",
    event: "New York 1997 · match IBM, partita 6",
    year: 1997,
    result: "1-0",
    eco: "B17",
    highlight:
      "19 mosse e la storia cambia: la prima vittoria di una macchina in match contro il campione del mondo.",
    intro:
      "New York, 11 maggio 1997, partita decisiva del match. Kasparov sbaglia l'ordine di mosse nella Caro-Kann e Deep Blue gioca il sacrificio tematico 8.Nxe6 senza esitare. In 19 mosse, per la prima volta nella storia, una macchina batte il campione del mondo in un match: lo spartiacque degli scacchi moderni.",
    pgn: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Ng5 Ngf6 6. Bd3 e6 7. N1f3 h6 8. Nxe6 Qe7 9. O-O fxe6 10. Bg6+ Kd8 11. Bf4 b5 12. a4 Bb7 13. Re1 Nd5 14. Bg3 Kc8 15. axb5 cxb5 16. Qd3 Bc6 17. Bf5 exf5 18. Rxe7 Bxe7 19. c4 1-0",
    annotations: {
      13: "7...h6?? L'errore fatale: l'ordine di mosse corretto era 7...Bd6 prima di ...h6. Kasparov, provato dal match, lo inverte.",
      14: "8.Nxe6! Il sacrificio tematico, noto alla teoria: la macchina lo gioca all'istante. Il re nero non arroccherà mai più.",
      19: "10...Kd8: il re resta al centro per sempre. Da qui in poi Deep Blue apre linee con la freddezza di chi non conosce la paura.",
      32: "17.Bf5! L'ultima finezza: devia il pedone e prepara Rxe7. La posizione nera collassa.",
      36: "19.c4: Kasparov abbandona dopo 19 mosse. La macchina vince il match 3,5–2,5. Niente, negli scacchi, sarà più come prima.",
    },
  },
  {
    slug: "kasparov-immortale",
    title: "L'Immortale di Kasparov",
    white: "Garri Kasparov",
    black: "Veselin Topalov",
    event: "Wijk aan Zee 1999 · Hoogovens",
    year: 1999,
    result: "1-0",
    eco: "B07",
    highlight:
      "24.Rxd4!!: inizia una combinazione di venti mosse che trascina il re nero da b8 fino a d1.",
    intro:
      "Wijk aan Zee, 20 gennaio 1999. Kasparov sacrifica una torre e calcola una combinazione che si estende per venti mosse: il re di Topalov viene trascinato da b8 attraverso tutta la scacchiera, fino a d1, dentro il campo bianco. Per molti è la più grande partita mai giocata.",
    pgn: "1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0",
    annotations: {
      20: "Arrocchi opposti e attacchi contrapposti: la Pirc è diventata una corsa. Kasparov ha già lanciato la donna in h6.",
      37: "19...d5: Topalov apre il centro convinto di stare bene. La posizione si accende: ogni mossa ora è critica.",
      46: "24.Rxd4!! Il sacrificio di torre. Se 24...cxd4, il re nero verrà estratto dalla sua fortezza. Topalov accetta: inizia la combinazione immortale.",
      48: "25.Re7+! Seconda offerta: la torre taglia la settima. Il re nero deve avanzare — 25...Kb6 e comincia la marcia forzata.",
      52: "27.b4+: ogni mossa bianca è uno scacco o una minaccia mortale. Kasparov aveva calcolato tutto fino in fondo, da qui a quindici mosse.",
      64: "33.c3+! Il re nero ha mangiato tre pedoni in casa bianca, ma ogni cattura lo ha portato più vicino alla rete. Ora 33...Kxc3 è forzato.",
      69: "35...Kd1: il re di Topalov è arrivato in d1, dentro il campo bianco, a fianco del re avversario. Una migrazione senza precedenti ai vertici.",
      86: "44.Qa7: la torre nera cade e il finale è vinto. Topalov abbandona. Combinazione iniziata alla mossa 24: venti mosse calcolate.",
    },
  },
  {
    slug: "anand-immortale",
    title: "L'Immortale di Anand",
    white: "Levon Aronian",
    black: "Viswanathan Anand",
    event: "Wijk aan Zee 2013 · Tata Steel",
    year: 2013,
    result: "0-1",
    highlight:
      "16...Nde5!!: Anand lascia torre e pezzi in presa e abbatte Aronian in 23 mosse di preparazione e fantasia.",
    intro:
      "Wijk aan Zee, 15 gennaio 2013. Anand, campione del mondo in carica, gioca contro Aronian una Merano preparata in casa e la trasforma in arte: pezzi lasciati in presa, una scacchiera in fiamme e la resa del Bianco dopo appena 23 mosse, con la mossa silenziosa 23...Be3.",
    pgn: "1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6 5. e3 Nbd7 6. Bd3 dxc4 7. Bxc4 b5 8. Bd3 Bd6 9. O-O O-O 10. Qc2 Bb7 11. a3 Rc8 12. Ng5 c5 13. Nxh7 Ng4 14. f4 cxd4 15. exd4 Bc5 16. Be2 Nde5 17. Bxg4 Bxd4+ 18. Kh1 Nxg4 19. Nxf8 f5 20. Ng6 Qf6 21. h3 Qxg6 22. Qe2 Qh5 23. Qd3 Be3 0-1",
    annotations: {
      24: "13.Nxh7: Aronian vince un pedone e attacca la torre f8. Ma Anand è ancora in preparazione: la risposta è già pronta.",
      25: "13...Ng4! Anand ignora il cavallo in h7 e lancia il suo verso il re. Le minacce nere arrivano prima.",
      29: "15...Bc5! L'alfiere inchioda il pedone d4 al re. Il Bianco è già costretto a mosse innaturali.",
      31: "16...Nde5!! La mossa della partita: il secondo cavallo entra lasciando la torre f8 in presa. Ogni cattura bianca apre una via di matto.",
      35: "18...Nxg4: con un pezzo in meno, il Nero domina. La coppia donna–cavallo e l'alfiere in d4 puntano tutti al re bianco.",
      45: "23...Be3! La mossa silenziosa che chiude: toglie g1 al re e prepara ...Qxh3+! gxh3 Nf2#. Aronian abbandona dopo 23 mosse.",
    },
  },
  {
    slug: "ding-immortale",
    title: "L'Immortale di Ding",
    white: "Bai Jinshi",
    black: "Ding Liren",
    event: "Lega cinese 2017",
    year: 2017,
    result: "0-1",
    eco: "E21",
    highlight:
      "Donna sacrificata alla mossa 15, re bianco braccato fino in h5: il capolavoro moderno per eccellenza.",
    intro:
      "Lega cinese, 4 novembre 2017. Ding Liren, futuro campione del mondo, sacrifica la donna alla quindicesima mossa e conduce un attacco di pezzi leggeri che insegue il re bianco fino in mezzo alla scacchiera. L'immortale dell'era dei motori: verificata dalle macchine, concepita da un umano.",
    pgn: "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Nf3 O-O 5. Bg5 c5 6. e3 cxd4 7. Qxd4 Nc6 8. Qd3 h6 9. Bh4 d5 10. Rd1 g5 11. Bg3 Ne4 12. Nd2 Nc5 13. Qc2 d4 14. Nf3 e5 15. Nxe5 dxc3 16. Rxd8 cxb2+ 17. Ke2 Rxd8 18. Qxb2 Na4 19. Qc2 Nc3+ 20. Kf3 Rd4 21. h3 h5 22. Bh2 g4+ 23. Kg3 Rd2 24. Qb3 Ne4+ 25. Kh4 Be7+ 26. Kxh5 Kg7 27. Bf4 Bf5 28. Bh6+ Kh7 29. Qxb7 Rxf2 30. Bg5 Rh8 31. Nxf7 Bg6+ 32. Kxg4 Ne5+ 0-1",
    annotations: {
      27: "14...e5! Ding apre la posizione con il re bianco ancora al centro: comincia lo spettacolo.",
      29: "15...dxc3!! Il sacrificio di donna: invece di riprendere il pezzo, Ding spinge il pedone e lascia la donna in d8.",
      31: "16...cxb2+: il pedone arriva a un passo dalla promozione e il re bianco resta inchiodato al centro. Per la donna, il Nero ha pezzi e attacco eterno.",
      39: "20...Rd4! La torre taglia la scacchiera: minaccia ...Rf4+ e la caccia al re comincia davvero.",
      51: "26...Kg7!! Con il re avversario in h5, Ding gioca una mossa silenziosa di re: prepara ...Rh8+ e chiude ogni via di fuga. Sangue freddo assoluto.",
      63: "32...Ne5+. Matto forzato: 33.Nxe5 Bf5+ 34.Kh5 Kg8 e ...Ng3# è imparabile. Il Bianco abbandona: il re è morto in mezzo alla scacchiera.",
    },
  },
];

export function findFamousGame(slug: string): FamousGame | undefined {
  return FAMOUS_GAMES.find((g) => g.slug === slug);
}
