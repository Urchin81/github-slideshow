# Assistente Asta Fantacalcio

Web app personale per gestire l'asta del Fantacalcio: importi il listino quotazioni,
configuri budget e rose (Classic o Mantra), e durante l'asta l'app ti suggerisce i
giocatori con il miglior rapporto qualità/prezzo in base al budget residuo e ai
ruoli ancora da coprire nella tua squadra.

## Funzionalità

- **Classic e Mantra**: modalità selezionabile in Setup. In Mantra il listino puó
  includere la colonna `RM` (ruoli multipli, es. `Dd;E`); un giocatore con piu'
  ruoli idonei puó essere assegnato a uno qualsiasi di essi al momento
  dell'acquisto.
- **Import listino intelligente**: carica il file Excel/CSV delle quotazioni
  ufficiali (colonne Ruolo/R, RM, Nome, Squadra, Qt.A, opzionalmente FVM). Se
  importi un file dopo il primo, l'app confronta il listino gia' caricato con
  quello nuovo: aggiorna i valori cambiati (quotazione, squadra, ruoli Mantra),
  non tocca nulla se un giocatore è invariato, aggiunge i nuovi e ti mostra
  un'anteprima da confermare prima di rimuovere i giocatori assenti nel nuovo
  file (con avviso esplicito se qualcuno di questi era già nella tua rosa).
- **Setup asta**: budget totale e slot/percentuale di budget per ruolo, sia in
  Classic (Portiere/Difensore/Centrocampista/Attaccante) che in Mantra (i 12
  ruoli: Por, Dc, Dd, Ds, B, E, M, C, W, T, A, Pc).
- **Suggerimenti in tempo reale**: per ogni giocatore ancora disponibile viene
  calcolato un punteggio che premia una quotazione alta rispetto al budget
  medio ancora spendibile per uno slot di quel ruolo, penalizza chi supera
  quel budget medio, e valorizza un FVM superiore alla quotazione se presente.
  In Mantra il punteggio usa il migliore tra i ruoli idonei del giocatore.
- **Tracciamento asta**: segna un giocatore come "Preso da me" (con prezzo
  pagato, aggiorna budget e rosa) o "Preso da altri" (rimosso dal mercato).
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
