import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, Player, Settings } from "./types";

interface AuctionState {
  players: Player[];
  settings: Settings;
  loadPlayers: (players: Player[]) => void;
  setSettings: (settings: Settings) => void;
  assignToMe: (id: string, prezzoPagato: number) => void;
  assignToOthers: (id: string) => void;
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
      loadPlayers: (players) => set({ players }),
      setSettings: (settings) => set({ settings }),
      assignToMe: (id, prezzoPagato) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, stato: "mia", prezzoPagato } : p)),
        })),
      assignToOthers: (id) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, stato: "altrui", prezzoPagato: undefined } : p
          ),
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
    { name: "fantacalcio-asta-store" }
  )
);
