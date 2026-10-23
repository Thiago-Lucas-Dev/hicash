import { classify } from "./intent-classifier.js";
import {
  extractTransactions,
  extractTarget,
  parseAmount,
} from "./entity-extractor.js";
import { periodFromText } from "./date-parser.js";
import { resolveCategory } from "./category-resolver.js";
import { ambiguity } from "./ambiguity-resolver.js";
import { normalize } from "./normalizer.js";

/** @param {string} message @param {{accounts?: any[], categories?: any[], aliases?: any[], settings?: any, pending?: any, context?: any}} [environment] */
export function interpret(
  message,
  {
    accounts = [],
    categories = [],
    aliases = [],
    settings = {},
    pending = null,
    context = null,
  } = {},
) {
  const text = normalize(message);
  if (pending?.kind === "choose" && /^\d+$/.test(text))
    return { intent: "choose", id: Number(text) };
  let intent = classify(message);
  if (
    /^e no mes passado\??$/.test(text) &&
    ["query_balance", "query_expenses", "compare", "analyze"].includes(
      context?.intent,
    )
  )
    intent = context.intent;
  if (["confirm", "cancel"].includes(intent)) return { intent };
  const period = periodFromText(message);
  const account =
    accounts.find((a) => a.id === settings.default_account_id) || accounts[0];
  const payment_method = /cartao de credito/.test(text)
    ? "credit_card"
    : /\bdebito\b/.test(text)
      ? "debit"
      : /\bdinheiro\b/.test(text)
        ? "cash"
        : /\bpix\b/.test(text)
          ? "pix"
          : settings.default_payment_method || "pix";
  if (intent === "create_transactions") {
    if (!account)
      return {
        intent: "clarify",
        question:
          "Crie uma conta em Configurações antes de registrar lançamentos.",
      };
    const extracted = extractTransactions(message);
    const question = ambiguity(extracted);
    if (question)
      return {
        intent: "clarify",
        question,
        draft: question.includes("descrição") ? message : undefined,
      };
    const type = /\b(recebi|ganhei|entrada)\b/.test(text)
      ? "income"
      : "expense";
    const status = /\b(tenho que pagar|vou pagar)\b/.test(text)
      ? "pending"
      : "completed";
    const items = extracted.items.map((item) => {
      const description = item.description
        .replace(
          /\s+(?:no|em|com)\s+(?:cartao de credito|debito|dinheiro|pix)\b/g,
          "",
        )
        .trim();
      return {
        account_id: account.id,
        category_id: resolveCategory(description, type, categories, aliases)
          ?.id,
        type,
        description,
        amount: item.amount,
        reference_date: item.reference_date,
        status,
        payment_method,
      };
    });
    return { intent, items };
  }
  if (
    ["query_expenses", "query_balance", "compare", "analyze"].includes(intent)
  ) {
    const accountMatch = accounts.find((a) => text.includes(normalize(a.name)));
    return { intent, ...period, account_id: accountMatch?.id };
  }
  if (
    ["edit_transaction", "delete_transaction", "status_transaction"].includes(
      intent,
    )
  ) {
    const target = extractTarget(message);
    return { intent, ...target, status: "completed" };
  }
  if (intent === "create_category") {
    const name = message.replace(/^.*?categor(?:ia|y)\s+/i, "").trim();
    return name
      ? {
          intent,
          name,
          type: /receita|entrada/i.test(message) ? "income" : "expense",
        }
      : { intent: "clarify", question: "Qual é o nome da categoria?" };
  }
  if (intent === "learn_category") {
    const match = text.match(
      /^(?:associe|associa|aprenda|categoriza|corrige categoria)\s+(.+?)\s+(?:com|a|como|para|em)\s+(.+)$/,
    );
    const category = categories.find(
      (c) => match && normalize(c.name) === match[2],
    );
    return match && category
      ? { intent, keyword: match[1], category_id: category.id }
      : {
          intent: "clarify",
          question:
            "Informe a palavra e a categoria, por exemplo: associa lanche a Alimentação.",
        };
  }
  if (intent === "set_budget") {
    const amount = text.match(
      /(?:a|para|de)\s+(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*$/,
    );
    const category = categories
      .filter((c) => c.type === "expense")
      .find((c) => text.includes(normalize(c.name)));
    if (!amount || !category)
      return {
        intent: "clarify",
        question: "Informe categoria e valor do limite mensal.",
      };
    return {
      intent,
      category_id: category.id,
      year: Number(period.start.slice(0, 4)),
      month: Number(period.start.slice(5, 7)),
      amount: parseAmount(amount[1]),
    };
  }
  return { intent };
}
