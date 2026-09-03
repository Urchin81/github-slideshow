/**
 * Alcuni URL mostrati in pagina arrivano da fonti esterne non fidate (feed RSS,
 * pagine scrapate di FPEDIA): prima di usarli come href/src verifichiamo che
 * siano http/https, cosi' un feed malevolo non puo' iniettare uno schema
 * pericoloso (es. "javascript:") in un link cliccabile (OWASP A03 - Injection).
 */
export function isSafeHttpUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url, "https://placeholder.invalid");
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
