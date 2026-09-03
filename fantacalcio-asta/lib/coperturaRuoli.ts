import { Player, RUOLI, RUOLI_MANTRA, Ruolo, RuoloMantra } from "./types";
import { costruisciMatchmaker } from "./bipartiteMatching";
import { SlotModulo } from "./moduliMantra";

/**
 * Copertura di un ruolo nella propria rosa: "assente" = nessun giocatore per quel
 * ruolo, "senza_sostituto" = un solo giocatore (nessun ricambio in caso di
 * ballottaggio/turnover), "coperto" = almeno due.
 */
export type LivelloCopertura = "assente" | "senza_sostituto" | "coperto";

/**
 * Versione Mantra: un giocatore multi-ruolo non va contato due volte su due ruoli
 * diversi (rischierebbe di segnare "coperto" un ruolo dove in realtà quel giocatore
 * copre solo l'altro). Si riusa il matching bipartito massimo già usato per i moduli
 * (lib/bipartiteMatching.ts, algoritmo di Kuhn): due slot sintetici per ruolo (titolare
 * + sostituto) fanno sì che ogni giocatore venga assegnato a un solo slot totale.
 */
export function computeCoperturaRuoliMantra(players: Player[]): Record<RuoloMantra, LivelloCopertura> {
  const mie = players.filter((p) => p.stato === "mia");
  const slots: SlotModulo[] = RUOLI_MANTRA.flatMap((r) => [[r], [r]] as SlotModulo[]);
  const matcher = costruisciMatchmaker(
    slots,
    mie.map((p) => ({ id: p.id, ruoli: p.ruoliMantra ?? [] }))
  );
  const assegnazione = matcher.assegnazioniComplete();
  const risultato = {} as Record<RuoloMantra, LivelloCopertura>;
  RUOLI_MANTRA.forEach((r, i) => {
    const titolare = assegnazione[i * 2];
    const sostituto = assegnazione[i * 2 + 1];
    risultato[r] = titolare === undefined ? "assente" : sostituto === undefined ? "senza_sostituto" : "coperto";
  });
  return risultato;
}

/** Versione Classic: un giocatore ha un solo ruolo, quindi basta un conteggio diretto. */
export function computeCoperturaRuoliClassic(players: Player[]): Record<Ruolo, LivelloCopertura> {
  const mie = players.filter((p) => p.stato === "mia");
  const risultato = {} as Record<Ruolo, LivelloCopertura>;
  RUOLI.forEach((r) => {
    const n = mie.filter((p) => p.ruolo === r).length;
    risultato[r] = n === 0 ? "assente" : n === 1 ? "senza_sostituto" : "coperto";
  });
  return risultato;
}
