import { test, expect } from "@playwright/test";
import { login } from './login';

test.skip(process.env.E2E_ALLOW_WRITE !== 'true', 'Somente em banco descartável com E2E_ALLOW_WRITE=true.');

test("conta, lançamento, dashboard e assistente usam os mesmos dados", async ({
  page,
}) => {
  const suffix = Date.now().toString();
  await login(page);
  await page.getByRole("button", { name: "Configurações" }).click();
  await page.getByRole("button", { name: "Conta", exact: true }).click();
  await page.getByLabel("Nome").fill(`Banco E2E ${suffix}`);
  await page.getByLabel("Saldo inicial").fill("1000");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText(`Banco E2E ${suffix}`).first()).toBeVisible();

  await page.getByRole("button", { name: "Movimentações" }).click();
  await page.getByRole("button", { name: "Lançamento", exact: true }).click();
  await page.getByLabel("Descrição").fill(`Mercado E2E ${suffix}`);
  await page.getByLabel("Valor").fill("50");
  await page
    .getByRole("dialog")
    .getByLabel("Categoria")
    .selectOption({ label: "Alimentação" });
  await page
    .getByRole("dialog")
    .getByLabel("Conta")
    .selectOption({ label: `Banco E2E ${suffix}` });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText(`Mercado E2E ${suffix}`)).toBeVisible();

  await page.getByRole("button", { name: "Visão geral" }).click();
  await expect(page.getByText(`Mercado E2E ${suffix}`)).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  await page
    .getByRole("button", { name: "Assistente", exact: true })
    .first()
    .click();
  await page.getByLabel("Mensagem").fill("quanto gastei este mês?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText(/Despesas no período:/).last()).toBeVisible();
  await page.getByLabel("Mensagem").fill("50 lanche");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Lançamento registrado.").last()).toBeVisible();
  await page.getByLabel("Mensagem").fill("apaga o último lanche");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar exclusão" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page.getByText(/excluído/).last()).toBeVisible();
  await page.getByLabel("Mensagem").fill("desfaz isso");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(
    page.getByText("Última movimentação desfeita.").last(),
  ).toBeVisible();
});
