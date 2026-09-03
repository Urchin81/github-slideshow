"use client";

import { useAuctionStore } from "@/lib/store";

export function ResetButton() {
  const resetAll = useAuctionStore((s) => s.resetAll);

  return (
    <button
      onClick={() => {
        if (confirm("Azzerare tutte le chiamate (mia squadra e prese da altri)? Il listino resta caricato.")) {
          resetAll();
        }
      }}
      className="text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-1.5 hover:bg-red-100"
    >
      Azzera chiamate
    </button>
  );
}
