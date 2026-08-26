"use client";

import Link from "next/link";
import { useAuctionStore } from "@/lib/store";
import { BudgetPanel } from "@/components/BudgetPanel";
import { RosterPanel } from "@/components/RosterPanel";
import { PlayerTable } from "@/components/PlayerTable";
import { ResetButton } from "@/components/ResetButton";

export default function Home() {
  const players = useAuctionStore((s) => s.players);

  if (players.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center bg-white rounded-lg shadow p-8 mt-12">
        <h1 className="text-xl font-semibold mb-2">Nessun listino caricato</h1>
        <p className="text-slate-500 mb-6">
          Importa il listino quotazioni per iniziare a usare l&apos;assistente durante l&apos;asta.
        </p>
        <Link href="/settings" className="inline-block bg-slate-900 text-white rounded px-4 py-2">
          Vai a Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap gap-4 items-start">
        <ResetButton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4">
        <BudgetPanel />
        <PlayerTable />
        <div className="space-y-4">
          <RosterPanel />
        </div>
      </div>
    </div>
  );
}
