import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatResult } from "./ChatResult";

describe("resumos do assistente", () => {
  it("mostra dados confirmados de uma despesa e mantém o histórico legível", () => {
    render(<ChatResult onChoose={() => {}} payload={JSON.stringify({ presentation: { kind: "transactions_created", items: [{ id: 7, type: "expense", description: "Lanche", amount: "50.00", reference_date: "2026-10-28", status: "completed", payment_method: "pix", account_name: "Conta teste", category_name: "Alimentação" }] } })} />);
    expect(screen.getByText("Lanche")).toBeTruthy();
    expect(screen.getByText("Conta teste")).toBeTruthy();
    expect(screen.getByText("Alimentação")).toBeTruthy();
    expect(screen.getByText((text) => text.replace(/\s/g, " ") === "− R$ 50,00")).toBeTruthy();
  });

  it("não cria cartão de sucesso a partir de payload inválido", () => {
    const { container } = render(<ChatResult onChoose={() => {}} payload="invalid" />);
    expect(container.textContent).toBe("");
  });
});
