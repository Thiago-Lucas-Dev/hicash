import { normalize } from "./normalizer.js";

export function classify(message) {
  const text = normalize(message);
  if (/^(sim|confirmo|confirmar|pode excluir)$/.test(text)) return "confirm";
  if (/^(nao|cancelar|cancela)$/.test(text)) return "cancel";
  if (/^(desfaz|desfazer|volta)\b/.test(text)) return "undo";
  if (/^(associe|associa|aprenda|categoriza|corrige categoria)\b/.test(text))
    return "learn_category";
  if (/\b(cria|criar) categoria\b/.test(text)) return "create_category";
  if (/\b(limite|orcamento)\b/.test(text)) return "set_budget";
  if (/^(apaga|exclui|remove|deleta)\b/.test(text)) return "delete_transaction";
  if (/^(corrige|altera|muda|edita)\b/.test(text)) return "edit_transaction";
  if (
    /\b(ja paguei|ja recebi|marcar como pago|marcar como recebido)\b/.test(text)
  )
    return "status_transaction";
  if (/\b(economizar|economia|analis[ae]|onde gasto mais)\b/.test(text))
    return "analyze";
  if (/\b(mais que|menos que|compar[ae]|em relacao)\b/.test(text))
    return "compare";
  if (/\b(saldo|quanto tenho|tenho no banco)\b/.test(text))
    return "query_balance";
  if (
    /\b(quanto gastei|despesas|gastos|gastei quanto)\b/.test(text) ||
    /^e no mes passado\??$/.test(text)
  )
    return "query_expenses";
  if (
    /\d/.test(text) &&
    (/\b(recebi|ganhei|entrada)\b/.test(text) ||
      /\b(gastei|paguei|comprei|tenho que pagar|vou pagar)\b/.test(text) ||
      /^\d/.test(text))
  )
    return "create_transactions";
  return "unknown";
}
