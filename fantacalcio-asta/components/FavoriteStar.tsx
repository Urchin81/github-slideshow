"use client";

import { useAuctionStore } from "@/lib/store";

export function FavoriteStar({ id, preferito }: { id: string; preferito?: boolean }) {
  const toggleFavorite = useAuctionStore((s) => s.toggleFavorite);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(id);
      }}
      title={preferito ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      className={`leading-none ${preferito ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}
    >
      {preferito ? "★" : "☆"}
    </button>
  );
}
