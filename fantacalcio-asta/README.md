# Assistente Asta Fantacalcio

Web app personale per gestire l'asta del Fantacalcio: importi il listino quotazioni,
configuri budget e rose (Classic o Mantra), e durante l'asta l'app ti suggerisce i
giocatori con il miglior rapporto qualità/prezzo in base al budget residuo e ai
ruoli ancora da coprire nella tua squadra.

## Funzionalità

- **Classic e Mantra**: modalità selezionabile in Settings. In Mantra il listino puó
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
  senza toccare il listino importato **né i preferiti** (vedi sotto).
- **Preferiti**: la stellina (☆/★) accanto a ogni giocatore — nella tabella,
  nella rosa e nella scheda giocatore — lo segna come preferito. È un dato
  personale indipendente dallo stato d'asta: "Azzera chiamate" non lo tocca,
  cosí i giocatori su cui vuoi puntare restano segnati anche dopo un reset.
  Nella tabella si può filtrare con "Solo preferiti ★".
- **La mia rosa ordinata per linea (Mantra)**: in Mantra i giocatori presi
  sono raggruppati dall'alto verso il basso in Portieri, Difensori,
  Centrocampisti e Attaccanti (un giocatore multi-ruolo va nella prima linea
  che uno dei suoi ruoli copre); in Classic segue già l'ordine
  Portiere/Difensore/Centrocampista/Attaccante.
- **Aggiornamento dati (in Settings)**: tutti i pulsanti che scaricano dati da
  fonti esterne (notizie, FPEDIA) stanno nella pagina **⚙️ Settings**, non in
  dashboard — sono operazioni di "manutenzione" separate dal seguire l'asta
  dal vivo.
  - **Notizie**: interrogano un set di feed RSS di siti calcio (configurabili
    in `lib/newsSources.ts`) e per ogni giocatore trovano le ultime 3 notizie
    con data e link. Dal testo delle notizie vengono dedotti in modo euristico
    i flag rigorista/tiratore punizioni/tiratore angoli e un trend qualitativo
    (es. "Infortunato", "Titolare fisso"). "Aggiorna tutti" è pensato per il
    primo giro dopo un import; "Top 200 per valore" per aggiornamenti rapidi
    successivi.
  - **FPEDIA (stagione corrente)**: risolve ogni giocatore su
    fantacalciopedia.com tramite un indice nome→pagina costruito da 4
    richieste totali (una per ruolo: portieri/difensori/centrocampisti/
    attaccanti — le pagine elenco del sito riportano tutti i giocatori di quel
    ruolo con nome e link gia' nel markup, senza paginazione), poi importa ALG
    FCP, punteggio FCP, solidità investimento, resistenza infortuni,
    presenze/gol/assist/media voto/ammonizioni/espulsioni, presenze/gol/assist
    previsti, i tag (Panchinaro, Buona Media, Goleador, Assistman, Giovane
    talento) e la nota di scouting. Mostrate nella scheda giocatore insieme
    alla media fantavoto delle 2 stagioni precedenti.
  - **Corrispondenza esatta col cognome**: il listino ufficiale ha solo il
    cognome (con l'iniziale del nome quando serve a distinguere omonimi, es.
    "Adekunle A.") mentre FPEDIA usa nome+cognome (es. conosce "Scamacca" come
    `scamacca-gianluca`): la ricerca richiede che **tutte** le parole del
    cognome compaiano nel risultato candidato, e usa l'iniziale per scegliere
    tra più omonimi; se non trova nessuna corrispondenza esatta lascia il
    campo vuoto invece di rischiare un abbinamento sbagliato (vedi
    `scomponiNomeListino` in `lib/types.ts`).
  - **"Testa su un campione"**: prima di lanciare un aggiornamento su tutto il
    listino, il pulsante ambra fa lo stesso giro solo su una manciata di
    giocatori sparsi (per quotazione, non i primi N) e mostra riga per riga
    se sono stati trovati e perché no — utile per verificare che la ricerca
    funzioni davvero prima di un giro lungo su centinaia di giocatori. Anche
    sui giri completi, i giocatori non trovati restano elencati (fino a 30)
    con il motivo, invece di sparire in un conteggio aggregato.
- **Scheda giocatore**: nome, ruolo (Classic e/o Mantra), quotazione, FVM,
  trend, flag rigorista/punizioni/angoli, statistiche FPEDIA e ultime notizie
  con data e fonte.
- **Persistenza locale**: lo stato (listino, configurazione, assegnazioni,
  notizie, statistiche) resta salvato nel browser (localStorage), utile per
  riprendere l'asta se ricarichi la pagina.

## Avvio in locale

```bash
npm install
npm run dev
```

Poi apri `http://localhost:3000`, vai su **⚙️ Settings** per scegliere la
modalità (Classic/Mantra), importare il listino, configurare budget/rose e
lanciare gli aggiornamenti dati (notizie/FPEDIA), quindi torna alla pagina
principale per seguire l'asta.

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
- **FPEDIA è scraping, non un'API ufficiale**: `lib/fpedia.ts` non usa il
  motore di ricerca del sito (un primo tentativo basato su un endpoint di
  ricerca indovinato non trovava nulla sul sito reale) ma le pagine elenco
  per ruolo, la cui struttura è confermata da due scraper indipendenti dello
  stesso sito (github.com/protti/ScraperFantacalcio e
  github.com/DrElegantia/fanta-app) e da un campione HTML reale. Se il sito
  cambia quella struttura, usa il pulsante "Testa su un campione" in Settings
  per vedere subito quanti giocatori vengono trovati prima di lanciare
  l'aggiornamento su tutto il listino. Il parser della pagina giocatore è
  stato scritto e verificato contro un campione reale (in
  `lib/__fixtures__/fpedia-sample.html`), ma se il sito cambia markup alcuni
  campi potrebbero smettere di essere trovati (in quel caso torneranno `—`,
  non un errore che blocca il resto). Se invece la richiesta stessa fallisce
  (es. "fetch failed"), il messaggio d'errore include il motivo di rete
  sottostante (DNS, connessione rifiutata, ecc.), utile per capire se il
  problema è la tua rete/proxy locale piuttosto che il sito. Uso personale,
  non massivo: c'è già una pausa tra le richieste, ma resta scraping di un
  sito di terzi — verifica i loro termini d'uso se ne fai un uso intensivo o
  ripetuto.
