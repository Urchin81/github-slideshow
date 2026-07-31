import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, Player, RuoloMantra, Ruolo, Settings } from "./types";

interface AuctionState {
  players: Player[];
  settings: Settings;
  loadPlayers: (players: Player[]) => void;
  setSettings: (settings: Settings) => void;
  assignToMe: (id: string, prezzoPagato: number, slotRuolo?: Ruolo | RuoloMantra) => void;
  assignToOthers: (id: string) => void;
  resetPlayer: (id: string) => void;
  resetAll: () => void;
  applyNewsResults: (updates: Record<string, Partial<Player>>) => void;
}

export const useAuctionStore = create<AuctionState>()(
  persist(
    (set) => ({
      players: [],
      settings: DEFAULT_SETTINGS,
      loadPlayers: (players) => set({ players }),
      setSettings: (settings) => set({ settings }),
      assignToMe: (id, prezzoPagato, slotRuolo) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id
              ? { ...p, stato: "mia", prezzoPagato, slotRuolo: slotRuolo ?? p.ruolo }
              : p
          ),
        })),
      assignToOthers: (id) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id
              ? { ...p, stato: "altrui", prezzoPagato: undefined, slotRuolo: undefined }
              : p
          ),
        })),
      resetPlayer: (id) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id
              ? { ...p, stato: "disponibile", prezzoPagato: undefined, slotRuolo: undefined }
              : p
          ),
        })),
      resetAll: () =>
        set((state) => ({
          players: state.players.map((p) => ({
            ...p,
            stato: "disponibile",
            prezzoPagato: undefined,
            slotRuolo: undefined,
          })),
        })),
      applyNewsResults: (updates) =>
        set((state) => ({
          players: state.players.map((p) => (updates[p.id] ? { ...p, ...updates[p.id] } : p)),
        })),
    }),
    { name: "fantacalcio-asta-store" }
  )
);
