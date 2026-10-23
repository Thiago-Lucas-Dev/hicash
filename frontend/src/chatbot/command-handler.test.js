import { describe, it, expect } from "vitest";
import { interpret } from "./command-handler.js";
import { extractTransactions } from "./entity-extractor.js";

const env = {
  accounts: [{ id: 1, name: "Banco" }],
  categories: [
    { id: 2, name: "Alimentação", type: "expense" },
    { id: 3, name: "Outros", type: "expense" },
    { id: 4, name: "Salário", type: "income" },
  ],
  aliases: [],
  settings: { default_account_id: 1, default_payment_method: "pix" },
};

describe("assistente determinístico", () => {
  it("registra comando curto como despesa concluída", () => {
    const command = interpret("50 lanche", env);
    expect(command.intent).toBe("create_transactions");
    expect(command.items[0]).toMatchObject({
      amount: "50.00",
      description: "lanche",
      category_id: 2,
      status: "completed",
    });
  });
  it("pergunta antes de registrar descrição ausente ou data múltipla ambígua", () => {
    expect(interpret("gastei 50", env).intent).toBe("clarify");
    expect(interpret("50 lanche e 30 gasolina ontem", env).intent).toBe(
      "clarify",
    );
    expect(interpret("50 lanche ontem e 30 gasolina hoje", env).intent).toBe(
      "create_transactions",
    );
  });
  it("extrai dois lançamentos e consulta período relativo", () => {
    expect(extractTransactions("50 lanche e 30 gasolina").items).toHaveLength(
      2,
    );
    expect(interpret("quanto gastei mês passado?", env).intent).toBe(
      "query_expenses",
    );
  });
  it("interpreta valores brasileiros e referência a pagamento", () => {
    expect(interpret("recebi 2.500,50 de salário", env).items[0]).toMatchObject(
      { amount: "2500.50", type: "income", category_id: 4 },
    );
    expect(interpret("já paguei o aluguel", env)).toMatchObject({
      intent: "status_transaction",
      description: "aluguel",
    });
  });
  it("cria limite e associa palavra à categoria", () => {
    expect(interpret("limite Alimentação a 600", env)).toMatchObject({
      intent: "set_budget",
      category_id: 2,
      amount: "600.00",
    });
    expect(interpret("associa feira a Alimentação", env)).toMatchObject({
      intent: "learn_category",
      keyword: "feira",
      category_id: 2,
    });
  });
  it("identifica compra no cartão sem saída de caixa", () => {
    expect(
      interpret("50 lanche no cartão de crédito", env).items[0],
    ).toMatchObject({ description: "lanche", payment_method: "credit_card" });
  });
});
