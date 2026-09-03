"use client";

import { useState } from "react";
import { BallottaggioFormazione, FormazioneSquadra, TitolareFormazione } from "@/lib/formazioni";
import { RUOLI, RUOLI_MANTRA, Ruolo, RuoloMantra } from "@/lib/types";

let contatoreId = 0;
function nuovoId(): string {
  contatoreId += 1;
  return `tmp-${contatoreId}`;
}

interface TitolareRiga extends TitolareFormazione {
  id: string;
}
interface BallottaggioRiga {
  id: string;
  ruolo: Ruolo;
  nota: string;
  candidati: { id: string; nome: string }[];
}

function daFormazione(f: FormazioneSquadra | null): {
  squadra: string;
  modulo: string;
  titolari: TitolareRiga[];
  ballottaggi: BallottaggioRiga[];
} {
  if (!f) return { squadra: "", modulo: "", titolari: [], ballottaggi: [] };
  return {
    squadra: f.squadra,
    modulo: f.modulo,
    titolari: f.titolari.map((t) => ({ ...t, id: nuovoId() })),
    ballottaggi: f.ballottaggi.map((b) => ({
      id: nuovoId(),
      ruolo: b.ruolo,
      nota: b.nota ?? "",
      candidati: b.candidati.map((nome) => ({ id: nuovoId(), nome })),
    })),
  };
}

export function FormazioneForm({
  formazioneIniziale,
  squadreEsistenti,
  onSalva,
  onAnnulla,
}: {
  /** null = nuova squadra. */
  formazioneIniziale: FormazioneSquadra | null;
  /** Nomi squadra già presenti (per evitare duplicati quando se ne crea una nuova). */
  squadreEsistenti: string[];
  onSalva: (formazione: FormazioneSquadra) => void;
  onAnnulla: () => void;
}) {
  const iniziale = daFormazione(formazioneIniziale);
  const [squadra, setSquadra] = useState(iniziale.squadra);
  const [modulo, setModulo] = useState(iniziale.modulo);
  const [titolari, setTitolari] = useState<TitolareRiga[]>(iniziale.titolari);
  const [ballottaggi, setBallottaggi] = useState<BallottaggioRiga[]>(iniziale.ballottaggi);
  const [errore, setErrore] = useState<string | null>(null);

  const modificaEsistente = formazioneIniziale !== null;

  function aggiungiTitolare() {
    setTitolari((prev) => [...prev, { id: nuovoId(), nome: "", ruolo: "D" }]);
  }
  function aggiornaTitolare(id: string, cambio: Partial<TitolareFormazione>) {
    setTitolari((prev) => prev.map((t) => (t.id === id ? { ...t, ...cambio } : t)));
  }
  function rimuoviTitolare(id: string) {
    setTitolari((prev) => prev.filter((t) => t.id !== id));
  }

  function aggiungiBallottaggio() {
    setBallottaggi((prev) => [
      ...prev,
      { id: nuovoId(), ruolo: "D", nota: "", candidati: [{ id: nuovoId(), nome: "" }, { id: nuovoId(), nome: "" }] },
    ]);
  }
  function aggiornaBallottaggio(id: string, cambio: Partial<Omit<BallottaggioRiga, "candidati">>) {
    setBallottaggi((prev) => prev.map((b) => (b.id === id ? { ...b, ...cambio } : b)));
  }
  function rimuoviBallottaggio(id: string) {
    setBallottaggi((prev) => prev.filter((b) => b.id !== id));
  }
  function aggiungiCandidato(ballottaggioId: string) {
    setBallottaggi((prev) =>
      prev.map((b) => (b.id === ballottaggioId ? { ...b, candidati: [...b.candidati, { id: nuovoId(), nome: "" }] } : b))
    );
  }
  function aggiornaCandidato(ballottaggioId: string, candidatoId: string, nome: string) {
    setBallottaggi((prev) =>
      prev.map((b) =>
        b.id === ballottaggioId
          ? { ...b, candidati: b.candidati.map((c) => (c.id === candidatoId ? { ...c, nome } : c)) }
          : b
      )
    );
  }
  function rimuoviCandidato(ballottaggioId: string, candidatoId: string) {
    setBallottaggi((prev) =>
      prev.map((b) => (b.id === ballottaggioId ? { ...b, candidati: b.candidati.filter((c) => c.id !== candidatoId) } : b))
    );
  }

  function salva() {
    const nomeSquadra = squadra.trim();
    if (!nomeSquadra) {
      setErrore("Il nome della squadra è obbligatorio.");
      return;
    }
    if (!modificaEsistente && squadreEsistenti.includes(nomeSquadra)) {
      setErrore("Esiste già una squadra con questo nome: modificala dalla scheda invece di crearne una nuova.");
      return;
    }
    const titolariValidi = titolari.filter((t) => t.nome.trim()).map((t) => ({ ...t, nome: t.nome.trim() }));
    if (titolariValidi.length === 0) {
      setErrore("Aggiungi almeno un titolare.");
      return;
    }

    const ballottaggiValidi: BallottaggioFormazione[] = ballottaggi
      .map((b) => ({
        ruolo: b.ruolo,
        nota: b.nota.trim() || undefined,
        candidati: b.candidati.map((c) => c.nome.trim()).filter(Boolean),
      }))
      .filter((b) => b.candidati.length >= 2);

    setErrore(null);
    onSalva({
      squadra: nomeSquadra,
      modulo: modulo.trim(),
      titolari: titolariValidi.map(({ nome, ruolo, ruoloMantra }) => ({ nome, ruolo, ruoloMantra })),
      ballottaggi: ballottaggiValidi,
      // Rigoristi/calci piazzati non si modificano ancora da questo modulo (arrivano dal CSV): si mantengono invariati.
      rigoristi: formazioneIniziale?.rigoristi ?? [],
      calciPiazzati: formazioneIniziale?.calciPiazzati ?? [],
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onAnnulla}>
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-lg mb-3">
          {modificaEsistente ? `Modifica ${formazioneIniziale!.squadra}` : "Nuova squadra"}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="text-sm">
            <span className="block text-slate-500 mb-1">Squadra</span>
            <input
              value={squadra}
              onChange={(e) => setSquadra(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1"
              placeholder="es. Inter"
              disabled={modificaEsistente}
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500 mb-1">Modulo</span>
            <input
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1"
              placeholder="es. 4-3-3"
            />
          </label>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm">Titolari ({titolari.length})</h3>
            <button onClick={aggiungiTitolare} className="text-xs bg-slate-900 text-white rounded px-2 py-1">
              + Titolare
            </button>
          </div>
          <div className="space-y-1">
            {titolari.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <select
                  value={t.ruolo}
                  onChange={(e) => aggiornaTitolare(t.id, { ruolo: e.target.value as Ruolo })}
                  className="border border-slate-300 rounded px-1 py-1 text-sm w-14"
                >
                  {RUOLI.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  value={t.ruoloMantra ?? ""}
                  onChange={(e) =>
                    aggiornaTitolare(t.id, { ruoloMantra: (e.target.value || undefined) as RuoloMantra | undefined })
                  }
                  className="border border-slate-300 rounded px-1 py-1 text-sm w-20"
                  title="Ruolo Mantra (opzionale)"
                >
                  <option value="">—</option>
                  {RUOLI_MANTRA.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  value={t.nome}
                  onChange={(e) => aggiornaTitolare(t.id, { nome: e.target.value })}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                  placeholder="Nome giocatore"
                />
                <button onClick={() => rimuoviTitolare(t.id)} className="text-red-500 hover:text-red-700 px-1 text-sm">
                  ✕
                </button>
              </div>
            ))}
            {titolari.length === 0 && <p className="text-xs text-slate-400">Nessun titolare aggiunto.</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm">Ballottaggi ({ballottaggi.length})</h3>
            <button onClick={aggiungiBallottaggio} className="text-xs bg-slate-900 text-white rounded px-2 py-1">
              + Ballottaggio
            </button>
          </div>
          <div className="space-y-2">
            {ballottaggi.map((b) => (
              <div key={b.id} className="border border-slate-200 rounded p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <select
                    value={b.ruolo}
                    onChange={(e) => aggiornaBallottaggio(b.id, { ruolo: e.target.value as Ruolo })}
                    className="border border-slate-300 rounded px-1 py-1 text-sm w-14"
                  >
                    {RUOLI.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <input
                    value={b.nota}
                    onChange={(e) => aggiornaBallottaggio(b.id, { nota: e.target.value })}
                    className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                    placeholder="Nota (opzionale)"
                  />
                  <button onClick={() => rimuoviBallottaggio(b.id)} className="text-red-500 hover:text-red-700 px-1 text-sm">
                    ✕ gruppo
                  </button>
                </div>
                <div className="space-y-1">
                  {b.candidati.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-1.5 pl-2">
                      <span className="text-[10px] text-slate-400 w-14">{i === 0 ? "favorito" : `alt. ${i}`}</span>
                      <input
                        value={c.nome}
                        onChange={(e) => aggiornaCandidato(b.id, c.id, e.target.value)}
                        className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                        placeholder="Nome giocatore"
                      />
                      <button
                        onClick={() => rimuoviCandidato(b.id, c.id)}
                        className="text-red-500 hover:text-red-700 px-1 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => aggiungiCandidato(b.id)}
                    className="text-xs text-slate-500 hover:underline pl-2"
                  >
                    + candidato
                  </button>
                </div>
              </div>
            ))}
            {ballottaggi.length === 0 && <p className="text-xs text-slate-400">Nessun ballottaggio aggiunto.</p>}
          </div>
        </div>

        {errore && <p className="text-red-600 text-sm mt-3">{errore}</p>}

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
          <button onClick={onAnnulla} className="text-sm text-slate-500 hover:underline px-2">
            Annulla
          </button>
          <button onClick={salva} className="bg-slate-900 text-white rounded px-3 py-2 text-sm">
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
