import { expect, type Page } from "@playwright/test";

export const e2eEmail = process.env.HICASH_E2E_EMAIL;
export const e2ePassword = process.env.HICASH_E2E_PASSWORD;

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(e2eEmail ?? "");
  await page.getByLabel("Senha").fill(e2ePassword ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();
}
