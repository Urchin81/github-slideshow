import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assistente Asta Fantacalcio",
  description: "Suggerimenti in tempo reale per l'asta del Fantacalcio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="min-h-screen">
          <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-lg font-bold">
              ⚽ Assistente Asta Fantacalcio
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="hover:underline">
                Asta
              </a>
              <a href="/moduli" className="hover:underline">
                Moduli
              </a>
              <a href="/setup" className="hover:underline">
                Setup
              </a>
            </nav>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
