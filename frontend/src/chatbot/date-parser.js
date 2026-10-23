import { normalize } from "./normalizer.js";

const iso = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function dateFromText(message, now = new Date()) {
  const text = normalize(message);
  const date = new Date(iso(now) + "T12:00:00");
  if (/\banteontem\b/.test(text)) date.setDate(date.getDate() - 2);
  else if (/\bontem\b/.test(text)) date.setDate(date.getDate() - 1);
  else {
    const match = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (match) {
      const year = match[3]
        ? Number(match[3].length === 2 ? "20" + match[3] : match[3])
        : date.getFullYear();
      const candidate = new Date(
        year,
        Number(match[2]) - 1,
        Number(match[1]),
        12,
      );
      if (
        candidate.getDate() !== Number(match[1]) ||
        candidate.getMonth() !== Number(match[2]) - 1
      )
        return null;
      return iso(candidate);
    }
  }
  return iso(date);
}
export function periodFromText(message, now = new Date()) {
  const text = normalize(message);
  const date = new Date(iso(now) + "T12:00:00");
  if (/mes passado|ultimo mes/.test(text)) date.setMonth(date.getMonth() - 1);
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  return { start: iso(first), end: iso(last) };
}
