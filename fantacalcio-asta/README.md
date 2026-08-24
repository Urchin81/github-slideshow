# Assistente Asta Fantacalcio

Web app personale per gestire l'asta del Fantacalcio: importi il listino quotazioni,
configuri budget e rose (Classic o Mantra), e durante l'asta l'app ti suggerisce i
giocatori con il miglior rapporto qualità/prezzo in base al budget residuo e ai
ruoli ancora da coprire nella tua squadra.

## Funzionalità

- **Classic e Mantra**: modalità selezionabile in Setup. In Mantra il listino puó
  includere la colonna `RM` (ruoli multipli, es. `Dd;E`) e un giocatore resta
  idoneo per tutti i ruoli elencati (non si sceglie un solo slot all'acquisto).
- **Import listino intelligente**: carica il file Excel/CSV delle quotazioni
  ufficiali (colonne Ruolo/R, RM, Nome, Squadra, Qt.A, opzionalmente FVM). Se
  importi un file dopo il primo, l'app confronta il listino gia' caricato con
  quello nuovo: aggiorna i valori cambiati (quotazione, squadra, ruoli Mantra),
  non tocca nulla se un giocatore è invariato, aggiunge i nuovi e ti mostra
  un'anteprima da confermare prima di rimuovere i giocatori assenti nel nuovo
  file (con avviso esplicito se qualcuno di questi era già nella tua rosa).
- **Setup asta**: in Classic, budget totale e slot/percentuale di budget per
  ruolo (Portiere/Difensore/Centrocampista/Attaccante). In **Mantra non ci
  sono slot fissi per ruolo** (sempre acquistabile qualsiasi ruolo): si imposta
  solo un numero minimo e massimo di giocatori totali da acquistare — oltre il
  massimo, "Preso da me" si disabilita.
- **Moduli tattici e ruoli più richiesti (Mantra)**: la dashboard calcola, con
  un algoritmo di matching (non un modello AI/LLM: deterministico e istantaneo,
  vedi sotto), quanti slot degli 11 moduli in `lib/moduliMantra.ts` la rosa
  attuale riesce a coprire, mostra i moduli più vicini al completamento e
  aggrega gli slot ancora scoperti in una classifica dei ruoli più necessari.
  I moduli sono stati trascritti a mano dallo schema "Mantra Experience"
  fornito: i più densi (3-5-2, 3-5-1-1, 4-1-4-1, 4-4-1-1, 4-2-3-1) potrebbero
  contenere qualche imprecisione di dettaglio — l'array `slot` in quel file è
  fatto apposta per essere facile da correggere se noti qualcosa che non
  corrisponde al tuo schema.
- **Suggerimenti in tempo reale**: punteggio che premia una quotazione alta
  rispetto al budget medio ancora spendibile (Classic: per slot di ruolo;
  Mantra: per posto rimanente in rosa), penalizza chi supera quella media, e
  valorizza un FVM superiore alla quotazione. In Mantra il punteggio aggiunge
  un bonus per ogni modulo (tra i più vicini al completamento) che il
  giocatore aiuterebbe effettivamente a completare.
- **Tracciamento asta**: segna un giocatore come "Preso da me" (con prezzo
  pagato, aggiorna budget e rosa) o "Preso da altri" (rimosso dal mercato). Il
  pulsante "Azzera chiamate" in dashboard rimette tutti i giocatori disponibili
  senza toccare il listino importato.
- **Aggiornamento notizie**: due pulsanti nella dashboard interrogano un set di
  feed RSS di siti calcio (configurabili in `lib/newsSources.ts`) e per ogni
  giocatore trovano le ultime 3 notizie con data e link. Dal testo delle
  notizie vengono dedotti in modo euristico i flag rigorista/tiratore
  punizioni/tiratore angoli e un trend qualitativo (es. "Infortunato",
  "Titolare fisso"). "Aggiorna tutti" è pensato per il primo giro dopo un
  import; "Top 200 per valore" per aggiornamenti rapidi successivi.
- **Scheda giocatore**: nome, ruolo (Classic e/o Mantra), quotazione, FVM,
  trend, flag rigorista/punizioni/angoli e ultime notizie con data e fonte.
- **Persistenza locale**: lo stato (listino, configurazione, assegnazioni,
  notizie) resta salvato nel browser (localStorage), utile per riprendere
  l'asta se ricarichi la pagina.

## Avvio in locale

```bash
npm install
npm run dev
```

Poi apri `http://localhost:3000`, vai su **Setup** per scegliere la modalità
(Classic/Mantra), importare il listino e configurare budget/rose, quindi torna
alla pagina principale per seguire l'asta.

## Note e limiti noti

- Ambito volutamente limitato alla tua squadra: non traccia rose/budget degli
  altri partecipanti alla lega.
- **"AI" dei moduli Mantra = algoritmo, non un LLM**: la copertura moduli e i
  ruoli necessari sono calcolati con un algoritmo di matching bipartito
  (Kuhn) che gira istantaneamente nel browser, senza chiavi API né costi né
  chiamate a servizi esterni. È deterministico: stessa rosa, stesso risultato
  ogni volta.
- I moduli Mantra in `lib/moduliMantra.ts` sono una trascrizione a mano
  dell'immagine fornita: verifica i tuoi moduli preferiti nel pannello
  "Moduli più vicini al completamento" e correggi quell'array se qualche slot
  non corrisponde al tuo schema.
- **Feed notizie non verificati**: l'elenco di default in `lib/newsSources.ts`
  è stato scelto in buona fede tra fonti italiane di calcio note per
  pubblicare RSS pubblici, ma non è stato possibile verificarne la
  raggiungibilità dall'ambiente in cui è stata sviluppata l'app (rete con
  accesso esterno limitato). Se un feed non risponde, l'app lo segnala
  nell'esito dell'aggiornamento senza bloccare gli altri: modifica pure
  l'elenco con URL che funzionano per te.
- I flag rigorista/tiratore punizioni/angoli e il trend sono dedotti con
  semplici euristiche testuali sulle notizie trovate: possono contenere falsi
  negativi (nessuna menzione recente) o imprecisioni, e vanno usati come
  spunto, non come dato certo.
- La libreria di parsing Excel (`xlsx`/SheetJS) ha alcune vulnerabilità note
  senza fix upstream al momento; il parsing avviene comunque interamente nel
  browser su un file che carichi tu stesso, quindi il rischio pratico per un
  uso personale è limitato.
