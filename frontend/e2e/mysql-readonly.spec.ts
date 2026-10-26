import { test, expect } from "@playwright/test";
import { e2eEmail, e2ePassword, login } from "./auth";

test.skip(
  !e2eEmail || !e2ePassword,
  "Configure HICASH_E2E_EMAIL e HICASH_E2E_PASSWORD.",
);

test("interface carrega dados reais do MySQL sem alterar registros", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByText("Saldo efetivo")).toBeVisible();
  await page.getByRole("button", { name: "Categorias" }).click();
  await expect(page.getByText("Alimentação")).toBeVisible();
  await expect(page.getByText("Salário")).toBeVisible();
});
