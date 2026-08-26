import { Crown } from "lucide-react";

/** Corona dorata da posizionare in alto a sinistra sopra una foto giocatore (contenitore "relative"), per i giocatori "Fuoriclasse" secondo FPEDIA. */
export function BadgeFuoriclasse({ size = 14 }: { size?: number }) {
  return (
    <span
      title="Fuoriclasse (FPEDIA)"
      className="absolute -top-0.5 -left-0.5 bg-amber-400 text-white rounded-full p-0.5 border border-white shadow-sm leading-none"
    >
      <Crown size={size} strokeWidth={2.5} fill="currentColor" />
    </span>
  );
}
