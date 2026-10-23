import { normalize } from "./normalizer.js";
import { dateFromText } from "./date-parser.js";

export function parseAmount(raw) {
  const clean = raw.replace(/\s/g, "");
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(?:\.\d{3})+$/.test(clean)
      ? clean.replace(/\./g, "")
      : clean;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value.toFixed(2) : null;
}
export function extractTransactions(message) {
  const clean = normalize(message).replace(
    /^\s*(gastei|paguei|comprei|recebi|ganhei|entrada|tenho que pagar|vou pagar)\s+/,
    "",
  );
  const parts = clean.split(/\s+e\s+(?=(?:r\$\s*)?\d)/);
  const explicitDate = (part) =>
    /\b(ontem|anteontem|hoje|\d{1,2}\/\d{1,2})\b/.test(part);
  const sharedDate =
    parts.length > 1 &&
    explicitDate(parts.at(-1)) &&
    parts.some((part) => !explicitDate(part));
  return {
    ambiguousDate: sharedDate,
    items: parts.map((part) => {
      const match = part.match(
        /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(.*)/,
      );
      if (!match) return null;
      const amount = parseAmount(match[1]);
      let description = match[2]
        .replace(/\b(hoje|ontem|anteontem)\b/g, "")
        .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, "")
        .replace(/^\s*(de|em|com)\s+/, "")
        .trim();
      description = description.replace(/[?.!,]+$/, "").trim();
      return { amount, description, reference_date: dateFromText(part) };
    }),
  };
}
export function extractTarget(message) {
  const text = normalize(message);
  const amount = text.match(
    /\b(?:para|por)\s+(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\b/,
  );
  const description = text
    .replace(
      /^(corrige|altera|muda|edita|apaga|exclui|remove|deleta|ja paguei|ja recebi)\s+/,
      "",
    )
    .replace(/\s+(para|por)\s+(?:r\$\s*)?\d+(?:[.,]\d{1,2})?.*$/, "")
    .replace(/^o ultimo\s+/, "")
    .replace(/^(o|a|um|uma)\s+/, "")
    .trim();
  return {
    description,
    amount: amount ? parseAmount(amount[1]) : null,
    latest: /\bultimo\b/.test(text),
  };
}
