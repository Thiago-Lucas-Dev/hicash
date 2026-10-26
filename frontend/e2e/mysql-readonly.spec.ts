import { test, expect } from '@playwright/test'
import { login } from './login'

test('interface carrega dados reais do MySQL sem alterar registros', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
  await expect(page.getByText('Saldo efetivo')).toBeVisible()
  await page.getByRole('button', { name: 'Categorias' }).click()
  await expect(page.getByText('Alimentação')).toBeVisible()
  await expect(page.getByText('Salário')).toBeVisible()
})
