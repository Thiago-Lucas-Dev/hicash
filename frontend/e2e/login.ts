import { expect, type Page } from '@playwright/test';

export async function login(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Defina E2E_EMAIL e E2E_PASSWORD para o teste de navegador.');

  await page.goto('/');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
}
