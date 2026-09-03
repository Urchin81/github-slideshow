import { FormazioneSquadra, normalizzaNome } from "@/lib/formazioni";
import { RUOLI, RUOLO_COLORE, RUOLO_LABEL } from "@/lib/types";

const GRIGIO_ACQUISTATO = "#94a3b8";

/**
 * Campo in miniatura come nell'articolo di riferimento: una riga per linea di ruolo
 * (portiere in basso, attacco in alto), con i titolari di quella linea affiancati. I giocatori
 * già acquistati (da chiunque) diventano grigi, per non fare l'errore di puntarci ancora.
 */
function CampoFormazione({
  formazione,
  giocatoriAcquistati,
}: {
  formazione: FormazioneSquadra;
  giocatoriAcquistati: Set<string>;
}) {
  const righe = [...RUOLI].reverse(); // A, C, D, P dall'alto verso il basso -> portiere in fondo
  return (
    <div className="bg-green-600 rounded relative border-2 border-white/30 py-4 px-2 space-y-3">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-16 h-16 rounded-full border-2 border-white/20" />
      </div>
      {righe.map((ruolo) => {
        const giocatori = formazione.titolari.filter((t) => t.ruolo === ruolo);
        if (giocatori.length === 0) return null;
        return (
          <div key={ruolo} className="flex justify-center gap-2 flex-wrap relative">
            {giocatori.map((g, i) => {
              const acquistato = giocatoriAcquistati.has(normalizzaNome(g.nome));
              return (
                <span
                  key={i}
                  className="text-white text-[11px] font-semibold rounded px-1.5 py-0.5 shadow text-center leading-tight"
                  style={{ backgroundColor: acquistato ? GRIGIO_ACQUISTATO : RUOLO_COLORE[ruolo] }}
                  title={
                    (g.ruoloMantra ? `${RUOLO_LABEL[ruolo]} (${g.ruoloMantra})` : RUOLO_LABEL[ruolo]) +
                    (acquistato ? " — già acquistato" : "")
                  }
                >
                  {g.nome}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function FormazioneSquadraCard({
  formazione,
  giocatoriAcquistati,
  onModifica,
  onElimina,
}: {
  formazione: FormazioneSquadra;
  giocatoriAcquistati: Set<string>;
  onModifica: () => void;
  onElimina: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold">{formazione.squadra}</h3>
          {formazione.modulo && <span className="text-xs text-slate-500">{formazione.modulo}</span>}
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={onModifica} className="text-slate-500 hover:text-slate-900 hover:underline">
            Modifica
          </button>
          <button onClick={onElimina} className="text-red-500 hover:text-red-700 hover:underline">
            Elimina
          </button>
        </div>
      </div>

      <CampoFormazione formazione={formazione} giocatoriAcquistati={giocatoriAcquistati} />

      {formazione.ballottaggi.length > 0 && (
        <div className="mt-2 space-y-1">
          <h4 className="text-[11px] uppercase text-slate-400 tracking-wide">Ballottaggi</h4>
          {formazione.ballottaggi.map((b, i) => (
            <p key={i} className="text-xs text-slate-600" title={b.nota}>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                style={{ backgroundColor: RUOLO_COLORE[b.ruolo] }}
              />
              {b.candidati.map((nome, j) => {
                const acquistato = giocatoriAcquistati.has(normalizzaNome(nome));
                return (
                  <span key={j}>
                    {j > 0 && <span className="text-slate-400"> vs </span>}
                    <span className={acquistato ? "text-slate-400" : j === 0 ? "font-semibold text-slate-800" : ""}>
                      {nome}
                    </span>
                  </span>
                );
              })}
              {b.nota && <span className="text-slate-400"> — {b.nota}</span>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
