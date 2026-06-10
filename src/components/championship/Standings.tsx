import { cn } from "@/lib/utils";
import { rankMembers, type MemberRow } from "@/lib/championship/types";

interface Props {
  members: MemberRow[];
  currentUserId: string;
  /** Stagione chiusa: mostra rank finale + spareggio promozione. */
  closed?: boolean;
}

/** Classifica di un girone: 1/½/0, ordinata per punti netti. */
export function Standings({ members, currentUserId, closed }: Props) {
  const ranked = rankMembers(members);
  // Round-robin: ogni iscritto gioca tutti gli altri una volta.
  const totalGames = Math.max(0, members.length - 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Giocatore</th>
            <th className="py-2 px-2 text-right font-medium">Punti</th>
            <th className="py-2 px-2 text-right font-medium">G</th>
            <th className="py-2 px-2 text-right font-medium">V</th>
            <th className="py-2 px-2 text-right font-medium">P</th>
            <th className="py-2 px-2 text-right font-medium">S</th>
            {closed && <th className="py-2 pl-2 text-right font-medium">Esito</th>}
          </tr>
        </thead>
        <tbody>
          {ranked.map((m, i) => {
            const net = m.points - m.penalty;
            const isMe = m.user_id === currentUserId;
            return (
              <tr
                key={m.id}
                className={cn(
                  "border-b border-border/50",
                  isMe && "bg-surface-2 font-medium",
                )}
              >
                <td className="py-2 pr-2 font-mono text-text-muted">{i + 1}</td>
                <td className="py-2 pr-2">
                  {m.display_name ?? "Giocatore"}
                  {isMe && <span className="ml-1.5 text-xs text-text-muted">(tu)</span>}
                </td>
                <td className="py-2 px-2 text-right font-mono tabular-nums">
                  {fmt(net)}
                  {m.penalty > 0 && (
                    <span className="ml-1 text-xs text-eval-mistake">
                      −{fmt(m.penalty)}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-right font-mono text-text-muted tabular-nums">
                  {m.played}/{totalGames}
                </td>
                <td className="py-2 px-2 text-right font-mono tabular-nums">{m.wins}</td>
                <td className="py-2 px-2 text-right font-mono tabular-nums">{m.draws}</td>
                <td className="py-2 px-2 text-right font-mono tabular-nums">{m.losses}</td>
                {closed && (
                  <td className="py-2 pl-2 text-right text-xs">
                    {m.rank_shift === 1 && <span className="text-accent">◢ Promosso</span>}
                    {m.rank_shift === -1 && <span className="text-text-muted">◥ Retrocesso</span>}
                    {(m.rank_shift ?? 0) === 0 && <span className="text-text-muted">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Mezzi punti come ½, interi senza decimale. */
function fmt(n: number): string {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  if (half) return whole === 0 ? "½" : `${whole}½`;
  return String(whole);
}
