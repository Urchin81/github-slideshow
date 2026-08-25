/**
 * Header di sicurezza applicati a tutte le risposte (OWASP A05 - Security
 * Misconfiguration). Note sulla CSP:
 * - script-src e style-src includono 'unsafe-inline' perche' l'App Router di
 *   Next.js inietta uno script inline per l'hydration (self.__next_f...) e
 *   l'app usa attributi style inline per i colori dei ruoli (RUOLO_COLORE):
 *   una CSP con nonce per rimuoverlo richiederebbe un middleware dedicato,
 *   fuori scope qui. object-src, frame-ancestors e base-uri restano comunque
 *   bloccati, che e' la parte che conta di piu' contro XSS/clickjacking.
 * - img-src include https: perche' le foto giocatore/stemmi arrivano da
 *   fantacalciopedia.com (scraping), non da un dominio fisso noto a priori.
 * - script-src include 'unsafe-eval' SOLO in sviluppo: il webpack di `next
 *   dev` usa eval per l'hot reload (non l'app o la libreria xlsx, verificato
 *   che l'import del listino funziona in build di produzione senza
 *   'unsafe-eval'); in produzione resta escluso.
 */
const isDev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

module.exports = nextConfig;
