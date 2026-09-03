import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, Player, Settings } from "./types";
import { FormazioneSquadra } from "./formazioni";

interface AuctionState {
  players: Player[];
  settings: Settings;
  formazioni: FormazioneSquadra[];
  loadPlayers: (players: Player[]) => void;
  setSettings: (settings: Settings) => void;
  setFormazioni: (formazioni: FormazioneSquadra[]) => void;
  salvaFormazioneSquadra: (formazione: FormazioneSquadra) => void;
  eliminaFormazioneSquadra: (squadra: string) => void;
  assignToMe: (id: string, prezzoPagato: number) => void;
  assignToOthers: (id: string, prezzoPagato?: number) => void;
  resetPlayer: (id: string) => void;
  resetAll: () => void;
  applyNewsResults: (updates: Record<string, Partial<Player>>) => void;
  toggleFavorite: (id: string) => void;
}

export const useAuctionStore = create<AuctionState>()(
  persist(
    (set) => ({
      players: [],
      settings: DEFAULT_SETTINGS,
      formazioni: [],
      loadPlayers: (players) => set({ players }),
      setSettings: (settings) => set({ settings }),
      setFormazioni: (formazioni) => set({ formazioni }),
      // Sostituisce la squadra con lo stesso nome se già presente (creazione/modifica dal modulo), altrimenti la aggiunge.
      salvaFormazioneSquadra: (formazione) =>
        set((state) => {
          const idx = state.formazioni.findIndex((f) => f.squadra === formazione.squadra);
          if (idx === -1) return { formazioni: [...state.formazioni, formazione] };
          const next = [...state.formazioni];
          next[idx] = formazione;
          return { formazioni: next };
        }),
      eliminaFormazioneSquadra: (squadra) =>
        set((state) => ({ formazioni: state.formazioni.filter((f) => f.squadra !== squadra) })),
      assignToMe: (id, prezzoPagato) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, stato: "mia", prezzoPagato } : p)),
        })),
      assignToOthers: (id, prezzoPagato) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, stato: "altrui", prezzoPagato } : p)),
        })),
      resetPlayer: (id) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, stato: "disponibile", prezzoPagato: undefined } : p
          ),
        })),
      // Azzera solo lo stato d'asta (chi ha preso chi): i preferiti, marcati a parte, restano intatti.
      resetAll: () =>
        set((state) => ({
          players: state.players.map((p) => ({
            ...p,
            stato: "disponibile",
            prezzoPagato: undefined,
          })),
        })),
      applyNewsResults: (updates) =>
        set((state) => ({
          players: state.players.map((p) => (updates[p.id] ? { ...p, ...updates[p.id] } : p)),
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, preferito: !p.preferito } : p)),
        })),
    }),
    {
      name: "fantacalcio-asta-store",
      // Fusione profonda di "settings" coi default: un campo aggiunto in un
      // aggiornamento (es. numeroPartecipanti) altrimenti resterebbe
      // "undefined" per chi ha gia' delle impostazioni salvate nel browser,
      // invece di prendere il valore di default.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuctionState> | undefined;
        if (!persisted) return currentState;
        return {
          ...currentState,
          ...persisted,
          settings: persisted.settings
            ? {
                ...currentState.settings,
                ...persisted.settings,
                ruoli: { ...currentState.settings.ruoli, ...persisted.settings.ruoli },
                mantra: { ...currentState.settings.mantra, ...persisted.settings.mantra },
              }
            : currentState.settings,
        };
      },
    }
  )
);
