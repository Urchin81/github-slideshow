/**
 * Confini della "stagione" calcistica corrente: 1° luglio -> 30 giugno
 * dell'anno successivo (stessa convenzione delle etichette "2025-2026" già
 * usate per le pillole FPEDIA in app/giocatore/[id]/page.tsx, e coerente con
 * l'apertura del calciomercato estivo). Usata per scartare notizie di
 * stagioni passate: un articolo di marzo dell'anno prima non aiuta a
 * decidere chi prendere in un'asta che riguarda la stagione in corso.
 */
export function stagioneCorrente(riferimento: Date = new Date()): { inizio: Date; fine: Date } {
  const mese = riferimento.getMonth(); // 0 = gennaio, 6 = luglio
  const annoInizio = mese >= 6 ? riferimento.getFullYear() : riferimento.getFullYear() - 1;
  const inizio = new Date(Date.UTC(annoInizio, 6, 1));
  const fine = new Date(Date.UTC(annoInizio + 1, 5, 30, 23, 59, 59, 999));
  return { inizio, fine };
}

/** true se la data (ISO o parsabile da `Date`) ricade nella stagione corrente. */
export function eDellaStagioneCorrente(data: string | undefined, riferimento: Date = new Date()): boolean {
  if (!data) return false;
  const t = new Date(data);
  if (Number.isNaN(t.getTime())) return false;
  const { inizio, fine } = stagioneCorrente(riferimento);
  return t >= inizio && t <= fine;
}
