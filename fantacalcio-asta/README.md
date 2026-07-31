# Assistente Asta Fantacalcio

Web app personale per gestire l'asta del Fantacalcio: importi il listino quotazioni,
configuri budget e rose, e durante l'asta l'app ti suggerisce i giocatori con il
miglior rapporto qualità/prezzo in base al budget residuo e ai ruoli ancora da
coprire nella tua squadra.

## Funzionalità

- **Import listino**: carica il file Excel/CSV delle quotazioni ufficiali
  (colonne Ruolo, Nome, Squadra, Qt.A, opzionalmente FVM).
- **Setup asta**: budget totale e slot/percentuale di budget per ruolo
  (Portieri, Difensori, Centrocampisti, Attaccanti).
- **Suggerimenti in tempo reale**: per ogni giocatore ancora disponibile viene
  calcolato un punteggio che premia una quotazione alta rispetto al budget
  medio ancora spendibile per uno slot di quel ruolo, penalizza chi supera
  quel budget medio, e valorizza un FVM superiore alla quotazione se presente.
- **Tracciamento asta**: segna un giocatore come "Preso da me" (con prezzo
  pagato, aggiorna budget e rosa) o "Preso da altri" (rimosso dal mercato).
- **Persistenza locale**: lo stato (listino, configurazione, assegnazioni) resta
  salvato nel browser (localStorage), utile per riprendere l'asta se ricarichi
  la pagina.

## Avvio in locale

```bash
npm install
npm run dev
```

Poi apri `http://localhost:3000`, vai su **Setup** per importare il listino e
configurare budget/rose, quindi torna alla pagina principale per seguire l'asta.

## Note

- Ambito volutamente limitato alla tua squadra: non traccia rose/budget degli
  altri partecipanti alla lega.
- La libreria di parsing Excel (`xlsx`/SheetJS) ha alcune vulnerabilità note
  senza fix upstream al momento; il parsing avviene comunque interamente nel
  browser su un file che carichi tu stesso, quindi il rischio pratico per un
  uso personale è limitato.
