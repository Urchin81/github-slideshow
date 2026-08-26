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
  partecipanti all'asta** (default 8).
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
- **Colonne della tabella giocatori**: ★, Ruolo, Foto (da FPEDIA se
  disponibile), Nome, Squadra (con la maglia/stemma prima del nome, se
  disponibile), Quotazione (header con il simbolo €), FCP×2 (ALG FCP e
  Punteggio FantaCalcioPedia, vedi sotto), Score e Urgenza (solo tra i
  disponibili, vedi sotto entrambi) e Azioni — sempre in quest'ordine.
  L'intestazione resta visibile ("sticky") mentre si scorre l'elenco verso il
  basso, cosí si vede sempre a quale colonna corrisponde ogni valore. Sopra la
  tabella, tra i disponibili, il menu **"Ordina per"** sceglie se ordinare per
  **Score** (default), **Urgenza** (vedi sotto entrambi), **ALG FCP** o
  **Punteggio FCP**.
- **Bordo colorato per titolarità**: la foto di ogni giocatore (in tabella e
  nel riquadro "in asta") ha un bordo spesso colorato in base a quanto è
  probabile che giochi — **verde** (titolarità alta: trend "Titolare
  fisso"/"In buona forma" dalle notizie o tag FPEDIA "Titolare"), **giallo**
  (titolarità media: un segnale di panchina ma con ancora un buon numero di
  presenze previste, oppure nessun segnale testuale ma presenze previste
  comunque discrete), **rosso** (titolarità bassa: infortunato, squalificato,
  o poche presenze previste), **grigio** (nessuna informazione disponibile).
  Riusa esattamente gli stessi segnali dello Score
  (`classificaTitolarita` in `lib/score.ts`), solo raggruppati in 4 fasce
  invece che in un punteggio continuo.
- **Pagina Moduli Mantra interattiva**: ogni riquadro modulo mostra, sotto il
  disegno del campo, se è completabile con la rosa attuale — e in tal caso
  quanti **insiemi distinti di 11 giocatori schierabili** puoi comporre
  (`lib/bipartiteMatching.ts`, `contaCombinazioniComplete`, con un tetto di
  999 insiemi distinti oltre il quale il numero esatto smette di contare, e
  un secondo tetto sui tentativi di backtracking grezzi per restare veloce
  anche con rose molto simmetriche) — oppure quali ruoli mancano ancora e
  quanti. Il conteggio deduplica sull'insieme di giocatori in campo: se due
  giocatori intercambiabili si scambiano solo lo slot restando entrambi
  schierati, non conta come una combinazione diversa. Passando il mouse su
  una voce dell'elenco "Moduli (dal più vicino al completamento)" nel
  pannello Budget compare un riepilogo di tutti i ruoli previsti dal modulo
  col numero di giocatori posseduti che li coprono (es. "Dc 2/2", "E 1/2"),
  con le righe incomplete evidenziate in rosso — utile per capire a colpo
  d'occhio cosa manca senza aprire il pop-up.
- **Pop-up formazione**: si apre sia dalla pagina **Moduli Mantra** sia
  cliccando su una voce dei moduli nel pannello Budget (la barra di
  completamento è verde solo a modulo completo, gialla finché manca ancora
  qualche slot). Mostra **le migliori formazioni possibili** con la rosa
  attuale, ordinate per Score totale dei titolari (somma dello Score di
  ciascuno, vedi sotto) decrescente — i pulsanti
  **‹ ›** accanto al nome del modulo scorrono tra queste alternative, dalla
  più forte alla più debole (un risultato "migliori trovate", non una
  garanzia di aver esplorato ogni combinazione possibile con rose molto
  simmetriche). Il campo è disegnato per intero (area, dischetto e porta di
  entrambe le squadre, linea di centrocampo), col portiere in basso e
  l'attacco in alto (direzione di gioco verso l'alto); i giocatori multi-ruolo
  mostrano le pillole dei rispettivi ruoli disposte lungo il bordo della
  foto in senso orario. Ogni titolare con almeno un panchinaro compatibile
  ha un cerchietto blu in basso a sinistra sulla foto col **numero di
  sostituti disponibili**: cliccandolo evidenzia in panchina solo i
  panchinari compatibili (gli altri si attenuano) — un click su uno di loro
  lo schiera al suo posto. Cliccare invece sulla foto di un titolare apre un
  piccolo menu per rimuoverlo dal campo. È anche possibile trascinare
  (drag & drop) un giocatore dal campo alla panchina e viceversa: si entra
  in campo solo se il ruolo del giocatore corrisponde a quello richiesto
  dallo slot, altri tentativi vengono ignorati. È solo una simulazione
  locale nella finestra: non tocca lo stato dell'asta, e "Ripristina
  automatica" torna in qualsiasi momento alla formazione (tra quelle
  proposte) attualmente selezionata, scartando le modifiche manuali.
- **Score**: l'unico punteggio-qualità dell'app (il vecchio "Punteggio" di
  convenienza economica quotazione/budget è stato rimosso), pensato per
  aiutare a scegliere — a parità di budget — i giocatori più forti in campo:
  quelli con più potenziale di gol e assist, voti costanti e pochi cartellini.
  Combina (`lib/score.ts`, pesi tutti nominati in cima al file e
  facilmente ritoccabili) solo dati già raccolti dall'app, mai un punteggio
  esterno opaco:
  - **Gol e assist attesi** (da FPEDIA): un gol vale di più per un difensore
    o un centrocampista che per un attaccante puro (per cui è "normale"); un
    assist vale uguale per tutti i ruoli.
  - **Media voto e costanza**: bonus se la media voto è sopra la sufficienza
    (e malus se sotto), più un piccolo bonus se è vicina a quella dell'ultima
    stagione precedente disponibile (affidabilità, non solo media assoluta).
  - **Cartellini**: malus proporzionale al tasso ammonizioni/espulsioni sulle
    presenze già giocate (non un conteggio assoluto, per non penalizzare chi
    ha giocato meno partite finora), rinforzato dal tag FPEDIA "Falloso".
  - **Presenze attese** e **calci piazzati** (rigorista/punizioni/angoli, più
    i tag FPEDIA "Piazzati"/"Outsider"/"Buona Media" già scaricati e prima
    inutilizzati): bonus, gol/assist extra spesso non catturati nel solo
    range previsionale.
  - **Titolarità**: combina il trend dedotto dalle notizie (es. "Titolare
    fisso" vs "In panchina") e i tag FPEDIA "Titolare"/"Panchinaro" (due
    segnali indipendenti ma da soli poco affidabili, sommati con un tetto per
    non doppiare lo stesso segnale), più un malus forte a parte per il flag
    "infortunato" strutturato (le liste infortunati di FPEDIA, più affidabile
    del solo trend testuale) — fondamentale per non restare scoperti in una
    posizione durante l'asta.
  - **Versatilità offensiva (solo Mantra)**: bonus per i giocatori con doppio
    ruolo il cui ruolo secondario è più avanzato/offensivo del primario (es.
    un Dc/E vale di più di un Dc puro; un C/T di più di un C puro), in base a
    un nuovo ranking di "avanzamento offensivo" dei 12 ruoli Mantra
    (`RUOLO_MANTRA_AVANZAMENTO` in `lib/types.ts`, da 0 il portiere a 5.5 la
    punta pura) — generalizza il criterio a qualunque coppia di ruoli, senza
    hard-codare casi specifici.
  - **Assicurazione titolare**: bonus automatico (nessun interruttore da
    attivare) per un giocatore disponibile che gioca nella stessa squadra
    reale di un titolare già nella tua rosa, con ruolo compatibile — utile
    soprattutto per gli ultimi slot di rosa, come "panchinaro" di un
    titolare che già possiedi in caso di rotazioni o infortuni; si attiva da
    solo sempre più spesso man mano che possiedi titolari, senza bisogno di
    sapere esplicitamente di essere agli ultimi slot.

  Il numero mostrato (in tabella e nel riquadro "in asta") è colorato con lo
  stesso semaforo relativo a 5 fasce delle altre statistiche FPEDIA, e
  passandoci sopra il mouse compare la scomposizione completa punto per
  punto — mai un numero "magico" senza spiegazione. Un giocatore senza alcun
  dato FPEDIA mostra "—" (nessuna base per stimare nulla).
- **Urgenza**: un secondo punteggio, indipendente dallo Score sopra (quello
  misura quanto è forte il giocatore in assoluto; questo quanto conviene
  assicurarselo **ora**, in base a come sta evolvendo l'asta) — si ricalcola
  da solo ad ogni acquisto, mio o degli avversari, perché letto sempre dalla
  rosa/mercato live. Combina (`lib/urgenza.ts`, stesso stile a pesi nominati
  di Score) quattro segnali, e a differenza di Score **non richiede dati
  FPEDIA** (basta un ruolo valido, quindi dà un segnale anche su chi non ha
  ancora la scheda scaricata):
  - **Bisogno di ruolo**: sale se possiedi ancora pochi giocatori di quel
    ruolo rispetto a quanti te ne servono (Classic: slot configurati in
    Settings; Mantra: riusa i gap dei moduli più vicini al completamento),
    scende quando il ruolo è già coperto a sufficienza.
  - **Esaurimento fasce**: divide tutti i giocatori di un ruolo (di
    chiunque) in fasce da *numero di partecipanti* ciascuna, ordinate per
    Score decrescente — la fascia 0 sono i migliori "uno a testa" in
    un'asta equilibrata. Sale quando le fasce migliori del ruolo si stanno
    esaurendo (prese da chiunque) e il giocatore in questione è ancora in
    una fascia alta: prenderlo ora, prima che sparisca, vale di più che
    aspettare.
  - **Temperatura di mercato**: confronta quanto stanno pagando gli
    avversari per quel ruolo rispetto alla quotazione — sopra 1 significa
    mercato "caldo" (si sta pagando più del previsto, urgenza su), sotto 1
    "freddo" (si può aspettare).
  - **Domanda/offerta di lega**: quanti giocatori di quel ruolo sono già
    stati presi (da chiunque) rispetto a quanti ne restano ancora
    disponibili — più il ruolo si svuota velocemente, più sale.

  I quattro segnali si sommano in un totale grezzo (senza un range fisso: a
  inizio asta, con nessun segnale ancora scattato, può restare vicino allo
  zero), ma il numero mostrato nel badge è invece il suo **percentile relativo
  a tutti gli altri giocatori con Urgenza calcolabile, riportato in scala
  0-100 (100 = il più urgente del listino)** — sempre confrontabile,
  indipendentemente da quanto sia compresso o ampio il totale grezzo in un
  dato momento della tua asta (`percentualeRelativaInCampione` in
  `lib/percentile.ts`, stessa tecnica di rango già usata per il semaforo a 5
  colori). L'ordinamento "Ordina per: Urgenza" resta comunque coerente col
  totale grezzo (la trasformazione in percentile non cambia l'ordine
  relativo). Stesso trattamento di Score per il resto: badge colorato con lo
  stesso semaforo, in tabella (solo tra i disponibili) e nel riquadro "in
  asta", con tooltip di scomposizione (che mostra i 4 contributi grezzi e su
  quale ruolo è stata calcolata, per i multi-ruolo Mantra) e selezionabile dal
  menu "Ordina per".
- **Tracciamento asta**: segna un giocatore come "Preso da me" (con prezzo
  pagato, aggiorna budget e rosa) o "Preso da altri" (rimosso dal mercato). Su
  un giocatore già preso, il bottone giallo con la matita ✏️ modifica il
  prezzo pagato senza toccare lo stato, il bottone rosso con la ✕ lo rimette
  disponibile (chiede conferma, perché il prezzo registrato va perso). Il
  pulsante "Azzera chiamate" in dashboard (o "Azzera asta" in Settings)
  rimette tutti i giocatori disponibili senza toccare il listino importato
  **né i preferiti** (vedi sotto) — entrambi chiedono conferma prima di agire.
- **Giocatore in asta (martello 🔨)**: nella tabella, ogni giocatore
  disponibile mostra solo l'icona del martello d'asta. Cliccandoci sopra si
  entra in modalità "focus" e compare un **riquadro giallo "in asta"** sopra
  la tabella con tutto il necessario per seguire il rilancio senza scorrere
  la riga: foto — con il cerotto 🩹 se infortunato e un **bordo colorato in
  base allo Score** (rosso chiaro = scarso, giallo = medio, verde = buono,
  blu = fuoriclasse; diverso dal bordo titolarità della tabella, qui conta
  quanto è forte il giocatore, non quanto è probabile che scenda in campo) —
  ruolo/i, squadra, quotazione, FVM, ALG FCP/Punteggio FCP, Score e Urgenza
  (vedi sopra entrambi), e — a differenza della fila di icone
  sempre-tutte-visibili altrove nell'app — **solo le caratteristiche
  effettivamente presenti**, ognuna con l'etichetta testuale accanto
  all'icona invece del solo tooltip (qui c'è spazio, e serve capire a colpo
  d'occhio cosa conta per quel giocatore senza dover passare il mouse su ogni
  icona). Sotto, un riquadro **"Valore Asta"** con bordo evidenziato raccoglie
  tutto ciò che serve per il rilancio: il controllo prezzo con tasti
  **−**/**+** e un campo numerico grande che parte da **0** (modificabile
  anche digitando direttamente), la stessa riga con "Max consigliato/tetto"
  (vedi sotto), e i due pulsanti — **"Preso da me"** (verde, ben visibile;
  richiede un prezzo maggiore di zero, disabilitato altrimenti e se hai
  raggiunto il numero massimo di giocatori) e **"Preso da altri"** (prezzo
  facoltativo: lasciandolo a 0 non viene registrato, un valore diverso da
  zero registra quanto ha pagato l'avversario — utile per seguire
  l'andamento delle puntate — e resta poi visibile in tabella sulla riga del
  giocatore). Sotto la tabella compaiono, ordinati per Score, solo gli altri
  giocatori ancora disponibili con ruolo compatibile (stesso ruolo in
  Classic; almeno un ruolo Mantra in comune in Mantra) — click sul loro
  martello per spostare il focus e confrontare al volo le alternative
  durante il rilancio, senza dover uscire dal riquadro. Un pulsante "Torna
  alla lista completa" nel riquadro chiude la modalità, che si chiude anche
  da sola non appena il giocatore fissato viene assegnato (a te o ad altri).
- **Prezzo massimo e rischio sforamento**: nel box "Valore Asta", "Max
  consigliato" (soglia prudente: +30% del budget medio ancora disponibile per
  quel ruolo/posto, con un bonus se l'FVM supera la quotazione — un allarme
  sul prezzo, indipendente da quanto il giocatore sia forte, vedi Score
  sopra) e "tetto" (aritmetico: oltre questo
  prezzo non resterebbe almeno 1 credito per ognuno degli altri slot/posti
  ancora da riempire) sono sempre visibili. Cambiando il prezzo con i tasti
  −/+ o digitandolo, superare una delle due soglie mostra un avviso live
  (ambra = attenzione, rosso = sforamento) insieme a un simulatore "cosa
  succede se" che mostra, prima di confermare, come cambierebbero budget
  residuo, slot/posti rimanenti e media/slot dopo l'acquisto (in Mantra,
  anche quali moduli aiuterebbe a sbloccare). Nel pannello Budget, un "Piano
  di spesa per ruolo residuo" mostra lo stesso tetto prudente per ogni ruolo
  (Classic) o una ripartizione approssimativa del budget residuo tra i ruoli
  Mantra più richiesti dai moduli vicini al completamento (Mantra) — una
  guida, non una prenotazione rigida.
- **Valore medio disponibile**: nel pannello Budget, accanto a "Residuo", il
  budget residuo diviso per i giocatori che mancano ancora per completare una
  rosa valida — **tenendo conto del minimo di portieri richiesto** (in
  Classic è già garantito dallo slot Portiere dedicato; in Mantra si prende
  il massimo tra "quanti giocatori mancano in totale per il minimo di rosa"
  e "quanti portieri mancano per lo slot Portiere configurato in Settings",
  perché se mancano più portieri di quanti giocatori mancherebbero in
  totale, quei portieri coprono comunque anche il fabbisogno totale). Se la
  rosa è già completa (portieri inclusi), mostra l'intero budget residuo
  invece di dividere per zero.
- **Fantasolidità e rischi**: quando un giocatore ha statistiche FPEDIA, la
  scheda giocatore mostra 4 barre percentuali — Algoritmo FCP, Punteggio
  FantaCalcioPedia, Solidità Fantainvestimento, Resistenza infortuni (tutte
  0-100, cosí come le pubblica fantacalciopedia.com) — colorate con lo stesso
  semaforo relativo a 5 fasce usato per le altre statistiche FPEDIA
  (confrontato con gli altri giocatori del tuo listino, non i colori fissi
  del sito). Nella tabella e nel riquadro "in asta" restano visibili solo
  Algoritmo FCP e Punteggio FantaCalcioPedia, come rettangoli colorati con
  angoli smussati — stesso stile di Score/Urgenza, per uniformità — con
  l'header della colonna che mostra due icone (bacchetta magica per ALG FCP,
  blocco note per Punteggio FCP) più "FCP", con il nome completo nel tooltip
  al passaggio del mouse invece che come etichetta sotto il numero. La
  caratteristica "Rischio infortuni" (icona cerotto rosso) si accende quando
  la Resistenza infortuni scende a 40 o meno.
- **Preferiti**: la stellina (☆/★) accanto a ogni giocatore — nella tabella,
  nella rosa e nella scheda giocatore — lo segna come preferito. È un dato
  personale indipendente dallo stato d'asta: "Azzera chiamate" non lo tocca,
  cosí i giocatori su cui vuoi puntare restano segnati anche dopo un reset.
  Nella tabella si può filtrare con "Solo preferiti ★".
- **La mia rosa ordinata per linea (Mantra)**: in Mantra i giocatori presi
  sono raggruppati dall'alto verso il basso in Portieri, Difensori,
  Centrocampisti e Attaccanti (un giocatore multi-ruolo va nella prima linea
  che uno dei suoi ruoli copre); in Classic segue già l'ordine
  Portiere/Difensore/Centrocampista/Attaccante, con la letterina colorata del
  ruolo (P/D/C/A) a sinistra del nome di ogni gruppo.
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
  - **Infortunati**: il pulsante "🩹 Aggiorna infortunati" (nello stesso
    pannello) legge le 4 pagine elenco "infortunati" di fantacalciopedia.com
    (una per ruolo) e marca/smarca `Player.infortunato` per l'intera rosa in
    un solo colpo — solo 4 richieste totali, non una per giocatore, quindi
    molto più veloce degli aggiornamenti sopra. Chi è infortunato mostra un
    **cerotto rosso** in basso a sinistra sulla foto (tabella, scheda
    giocatore, pop-up Moduli Mantra) e una nuova icona 🩹 tra le
    caratteristiche (rossa se infortunato, grigia se no, filtrabile come le
    altre); chi recupera perde cerotto e icona al giro successivo, perché lo
    stato riflette sempre l'ultimo giro letto dalle 4 liste, non uno storico.
    Nota: le pagine "infortunati" non sono state verificabili con un fetch
    diretto dall'ambiente di sviluppo (stesso limite di rete già noto per i
    feed notizie, vedi sotto) — il parsing riusa la struttura già confermata
    delle pagine elenco per ruolo, ma verificane l'esito reale sul sito.
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
- **Scheda giocatore**: la card in alto raggruppa foto, nome, ruoli,
  quotazione/FVM/trend, maglia+squadra e la fila di icone caratteristiche
  (tutto in un unico riquadro). Sotto, le statistiche FPEDIA: "in prima linea"
  (fuori da qualunque riquadro stagionale) restano solo i dati non legati a
  un'annata specifica — presenze/gol/assist previsti — mentre i dati della
  sola stagione più recente (Media Fanta Voto, Presenze, Fanta Media, FM su
  tot gare) finiscono in un riquadro a parte intitolato con quell'annata
  (es. "2025/2026"); le annate precedenti a quella non vengono più mostrate,
  per non affollare la pagina. Segue il riquadro "Fantasolidità e rischi"
  (vedi sopra) e infine Ammonizioni/Espulsioni. Chiude la scheda l'elenco
  delle ultime notizie con data e fonte.
- **Persistenza locale**: lo stato (listino, configurazione, assegnazioni,
  notizie, statistiche) resta salvato nel browser (localStorage), utile per
  riprendere l'asta se ricarichi la pagina.

## Sicurezza

L'app non ha autenticazione né un backend con dati condivisi (tutto resta nel
browser di chi la usa), quindi gran parte della superficie OWASP classica
(controllo accessi, gestione sessioni, dati sensibili) non si applica. I punti
concreti irrobustiti, mappati sulle categorie OWASP Top 10:

- **SSRF (A10)**: `POST /api/news` accettava in passato un elenco di feed RSS
  dal body della richiesta e li scaricava lato server con nessuna verifica —
  chiunque avesse chiamato l'endpoint direttamente avrebbe potuto far
  effettuare al server richieste verso qualunque destinazione (rete interna
  inclusa). L'interfaccia non ha mai usato quel parametro: è stato rimosso,
  l'endpoint usa sempre e solo i feed fissi di `lib/newsSources.ts`.
  Analogamente, `POST /api/fpedia` verifica (in `assicuraHostFpedia`, dentro
  `app/api/fpedia/route.ts`) che ogni URL recuperato dallo scraping abbia
  l'host di fantacalciopedia.com prima di scaricarlo, cosi' un link alterato
  nella pagina sorgente non puo' trasformare l'endpoint in un proxy verso
  altri indirizzi.
- **Injection/XSS (A03)**: i link mostrati in pagina che arrivano da fonti
  esterne non fidate (notizie RSS, foto/stemma/URL scheda da FPEDIA) passano
  ora da `isSafeHttpUrl` (`lib/url.ts`), che accetta solo `http:`/`https:`:
  un feed con un link `javascript:...` viene mostrato come testo semplice
  invece che come link cliccabile.
- **Misconfigurazione (A05)**: `next.config.js` imposta ora header di
  sicurezza su tutte le risposte — Content-Security-Policy, `X-Frame-Options:
  DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security` — e le API restituiscono
  messaggi d'errore generici al client (il dettaglio tecnico, incluse le
  cause di rete, va solo nei log server).
- **Insecure design / limiti di risorse (A04)**: l'import del listino
  rifiuta file oltre 20MB prima di avviare il parsing xlsx, e le richieste
  server verso FPEDIA hanno un timeout di 15s (il `fetch` di Node non ne ha
  uno di default).
- **Componenti vulnerabili (A06)**: `npm audit` segnala vulnerabilità note su
  `xlsx` (nessuna versione corretta pubblicata su npm da SheetJS — il fix
  esiste solo sulla loro CDN) e su `next`/`postcss` (fix disponibile solo con
  un aggiornamento di `next` a una major successiva, 14→16, che è una
  migrazione rischiosa e volutamente non applicata in automatico). Il rischio
  pratico di `xlsx` è limitato: il parsing avviene nel browser su un file che
  scegli tu stesso, non su dati multi-utente o lato server.

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
  "Moduli (dal più vicino al completamento)" e correggi quell'array se
  qualche slot non corrisponde al tuo schema.
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
- Vulnerabilità note nelle dipendenze (`xlsx`, `next`/`postcss`): vedi
  sezione "Sicurezza" sopra.
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
