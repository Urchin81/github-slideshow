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
  quello nuovo e mostra un'anteprima (nuovi/aggiornati/invariati/rimossi, con
  avviso se qualcuno dei rimossi era già nella tua rosa) **prima di toccare
  qualsiasi cosa**, chiedendo come procedere:
  - **Mantieni e aggiorna solo i cambiamenti** (opzione consigliata): aggiunge
    i nuovi, rimuove quelli assenti nel nuovo file, aggiorna i valori cambiati
    (quotazione, squadra, ruoli Mantra) — tutto il resto di ogni giocatore già
    tracciato (stato, prezzo pagato, preferito, notizie, statistiche FPEDIA)
    resta intatto.
  - **Aggiorna tutto**: cancella l'intero listino attuale e lo sostituisce da
    zero col nuovo file — chiede un'ulteriore conferma esplicita perché perde
    tutte le assegnazioni, i preferiti e i dati raccolti.
  - **Annulla**: non fa nulla, il listino resta quello di prima.
- **Setup asta**: in Classic, budget totale e slot/percentuale di budget per
  ruolo (Portiere/Difensore/Centrocampista/Attaccante). In **Mantra non ci
  sono slot fissi per ruolo** (sempre acquistabile qualsiasi ruolo): si imposta
  solo un numero minimo e massimo di giocatori totali da acquistare — oltre il
  massimo, "Preso da me" si disabilita. Si imposta anche il **numero di
  partecipanti all'asta** (default 8): serve solo per l'allerta scarsità
  titolari qui sotto.
- **Allerta scarsità titolari**: nel pannello Budget, un avviso "⚠️ Ruoli in
  esaurimento" elenca i ruoli (Classic: Portiere/Difensore/Centrocampista/
  Attaccante; Mantra: i 12 ruoli singoli Por/Dc/Dd/Ds/B/E/M/C/W/T/A/Pc) i cui
  migliori giocatori per quotazione stanno per finire sul mercato. La stima
  di "quanti titolari servono in totale" si basa su slot-per-ruolo × numero
  di partecipanti in Classic; in Mantra su quanto quel ruolo è richiesto in
  media dagli 11 moduli tattici × numero di partecipanti, dando credito
  frazionato quando un ruolo è solo una delle alternative di uno slot (es. in
  "W/A" il credito si divide a metà tra W e A) invece che pieno, cosí un
  ruolo con titolarità solo parziale in un modulo non gonfia la stima.
  Scatta quando i titolari disponibili scendono a non più di uno a
  partecipante.
- **Moduli tattici (Mantra)**: la dashboard calcola, con un algoritmo di
  matching (non un modello AI/LLM: deterministico e istantaneo, vedi sotto),
  quanti slot degli 11 moduli in `lib/moduliMantra.ts` la rosa attuale riesce
  a coprire e mostra i moduli più vicini al completamento; gli slot ancora
  scoperti dei moduli più vicini alimentano anche un bonus nel punteggio
  suggerito (vedi sotto), anche se non c'è più un pannello dedicato ai "ruoli
  più richiesti". I moduli sono stati trascritti a mano dallo schema "Mantra
  Experience" fornito: i più densi (3-5-2, 3-5-1-1, 4-1-4-1, 4-4-1-1, 4-2-3-1)
  potrebbero contenere qualche imprecisione di dettaglio — l'array `slot` in
  quel file è fatto apposta per essere facile da correggere se noti qualcosa
  che non corrisponde al tuo schema.
- **Suggerimenti in tempo reale**: punteggio che premia una quotazione alta
  rispetto al budget medio ancora spendibile (Classic: per slot di ruolo;
  Mantra: per posto rimanente in rosa), penalizza chi supera quella media, e
  valorizza un FVM superiore alla quotazione. In Mantra il punteggio aggiunge
  un bonus per ogni modulo (tra i più vicini al completamento) che il
  giocatore aiuterebbe effettivamente a completare.
- **Tracciamento asta**: segna un giocatore come "Preso da me" (con prezzo
  pagato, aggiorna budget e rosa) o "Preso da altri" (rimosso dal mercato). Su
  un giocatore già preso, il bottone giallo con la matita ✏️ modifica il
  prezzo pagato senza toccare lo stato, il bottone rosso con la ✕ lo rimette
  disponibile (chiede conferma, perché il prezzo registrato va perso). Il
  pulsante "Azzera chiamate" in dashboard (o "Azzera asta" in Settings)
  rimette tutti i giocatori disponibili senza toccare il listino importato
  **né i preferiti** (vedi sotto) — entrambi chiedono conferma prima di agire.
- **Giocatore in asta (martello 🔨)**: nella tabella, ogni giocatore
  disponibile mostra solo l'icona del martello d'asta al posto dei due
  pulsanti "Preso da me"/"Preso da altri". Cliccandoci sopra si entra in
  modalità "focus": quel giocatore resta fissato in cima alla tabella — con i
  veri pulsanti di assegnazione — mentre sotto compaiono, ordinati per
  punteggio, solo gli altri giocatori ancora disponibili con ruolo
  compatibile (stesso ruolo in Classic; almeno un ruolo Mantra in comune in
  Mantra), utile per confrontare al volo le alternative durante il rilancio.
  Un banner sostituisce i filtri normali con un pulsante "Torna alla lista
  completa"; la modalità si chiude anche da sola non appena il giocatore
  fissato viene assegnato (a te o ad altri).
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
    ruolo con nome e link gia' nel markup, senza paginazione), poi importa
    **tutte** le "pillole" colorate della pagina (ALG FCP, presenze, medie
    voto delle ultime stagioni, previsionali, ecc. — qualunque cosa il sito
    mostri, senza un elenco fisso di campi), i tag di scouting, l'immagine del
    giocatore e lo stemma della squadra, e la nota di scouting.
  - **Colori "a colpo d'occhio"**: la scheda giocatore mostra i valori
    numerici FPEDIA con un semaforo a 5 colori (Super azzurro, Buono verde,
    Sufficiente giallo, Mediocre arancione, Negativo rosso — legenda sotto le
    pillole), calcolato confrontando ogni valore con lo stesso dato (es.
    "Presenze 2025-2026") di **tutti gli altri giocatori del tuo listino con
    dati FPEDIA**: i migliori del gruppo sono "super", i peggiori "negativo"
    (vedi `computeLivelliRelativiFpedia` in `lib/suggestions.ts`). Se per
    quel dato ci sono ancora troppo pochi altri giocatori da confrontare
    (serve un campione minimo), la pillola resta grigio neutro invece di dare
    un giudizio poco significativo — più aggiorni giocatori, più il confronto
    diventa affidabile. I tag di scouting (Panchinaro, Titolare, ecc.), non
    essendo valori numerici confrontabili, restano invece colorati secondo il
    semaforo che assegna direttamente il sito.
  - **Aggiornamento singolo**: nella scheda giocatore, il pulsante "Aggiorna
    da FPEDIA" rifà la ricerca e lo scraping solo per quel giocatore, senza
    dover lanciare un giro su tutto il listino da Settings.
  - **Caratteristiche a colpo d'occhio in tabella**: sotto nome e squadra di
    ogni giocatore nella tabella compare sempre, su sfondo grigio chiaro, la
    stessa fila di icone lineari (rigorista, tiratore di punizioni/angoli,
    titolare, goleador, assistman, buona media, piazzati, outsider, giovane
    talento, panchinaro, falloso, rischio infortuni), dedotte dalle notizie e
    dai tag FPEDIA — tutte le icone compaiono sempre, ma restano grigio
    spento finché il giocatore non ha quella caratteristica: si "accendono"
    verdi quando è positiva e presente, rosse quando è negativa e presente
    (icone lineari via `lucide-react`, vedi
    `components/CaratteristicheGiocatore.tsx`). Cliccando su un'icona la
    tabella si filtra mostrando solo i giocatori con quella caratteristica
    attiva; l'icona cliccata resta evidenziata e appare una etichetta
    "‹caratteristica› ✕" tra i filtri per rimuoverlo in un tocco (o si
    toglie ricliccando la stessa icona). Nella scheda giocatore la stessa
    fila di icone (non cliccabile) sostituisce l'indicazione testuale dello
    stato d'asta.
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
  trend, statistiche FPEDIA (con foto del giocatore e stemma della squadra
  quando disponibili) e ultime notizie con data e fonte. I flag rigorista/
  tiratore punizioni/angoli dedotti dalle notizie non sono più mostrati qui
  (restano visibili come icone nella tabella giocatori, vedi sopra) per
  tenere la scheda più semplice da leggere.
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
