"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuctionStore } from "@/lib/store";
import { BudgetPanel } from "@/components/BudgetPanel";
import { RosterPanel } from "@/components/RosterPanel";
import { PlayerTable, RoleKey } from "@/components/PlayerTable";
import { ResetButton } from "@/components/ResetButton";

export default function Home() {
  const players = useAuctionStore((s) => s.players);
  // Id del giocatore il cui ballottaggio e' filtrato in PlayerTable: sollevato qui
  // perche' puo' essere impostato sia dall'icona panchina in RosterPanel (un mio
  // titolare) sia da quella in PlayerTable stessa (un giocatore ancora disponibile).
  const [filtroBallottaggioId, setFiltroBallottaggioId] = useState<string | null>(null);
  // Ruolo su cui è filtrata la tabella: sollevato qui perché può essere impostato
  // anche cliccando un badge in "Copertura ruoli" nel pannello Budget, non solo
  // dal <select> Ruolo dentro PlayerTable stessa.
  const [ruoloFiltro, setRuoloFiltro] = useState<RoleKey | "tutti">("tutti");

  // Clic su un badge di "Copertura ruoli" nel pannello Budget: filtra la tabella su
  // quel ruolo, chiudendo un eventuale filtro ballottaggio già aperto (altrimenti
  // quest'ultimo avrebbe priorità e il filtro ruolo resterebbe invisibile finché non
  // lo si chiude a mano).
  function filtraPerRuolo(ruolo: RoleKey) {
    setFiltroBallottaggioId(null);
    setRuoloFiltro(ruolo);
  }

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
      <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr_290px] gap-4">
        <BudgetPanel ruoloFiltro={ruoloFiltro} onFiltraRuolo={filtraPerRuolo} />
        <PlayerTable
          filtroBallottaggioId={filtroBallottaggioId}
          setFiltroBallottaggioId={setFiltroBallottaggioId}
          ruoloFiltro={ruoloFiltro}
          setRuoloFiltro={setRuoloFiltro}
        />
        <div className="space-y-4">
          <RosterPanel onFiltraBallottaggio={setFiltroBallottaggioId} />
        </div>
      </div>
    </div>
  );
}
