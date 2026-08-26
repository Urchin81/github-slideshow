import { Bandage } from "lucide-react";

/** Cerotto rosso da posizionare in basso a sinistra sopra una foto giocatore (contenitore "relative"). */
export function BadgeInfortunio({ size = 14 }: { size?: number }) {
  return (
    <span
      title="Infortunato"
      className="absolute -bottom-0.5 -left-0.5 bg-red-600 text-white rounded-full p-0.5 border border-white shadow-sm leading-none"
    >
      <Bandage size={size} strokeWidth={2.5} />
    </span>
  );
}
