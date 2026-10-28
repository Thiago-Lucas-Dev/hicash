import { test, expect } from "@playwright/test";

// Isolated visual fixture. These amounts are synthetic and never sent to the backend.
const account = { id: 1, name: "Conta de teste", opening_balance: "1000.00" };
const expenseCategory = { id: 2, name: "Alimentação", type: "expense", essential: true };
const incomeCategory = { id: 3, name: "Salário", type: "income", essential: false };
const transaction = { id: 4, account_id: 1, category_id: 2, type: "expense", description: "Lanche de teste", amount: "50.00", reference_date: "2026-10-28", status: "completed", payment_method: "pix", origin: "chatbot" };
const summary = { id: 4, type: "expense", description: "Lanche de teste", amount: "50.00", reference_date: "2026-10-28", status: "completed", payment_method: "pix", account_name: "Conta de teste", category_name: "Alimentação" };
const response: Record<string, unknown> = {
  "auth/me": { user: { id: 1, name: "Usuário de teste", email: "teste@example.com" } },
  accounts: [account], categories: [expenseCategory, incomeCategory], transactions: [transaction], transfers: [], recurrences: [], "categories/aliases": [],
  dashboard: { totals: { income: "3000.00", expense: "50.00" }, balance_totals: { effective: "950.00", projected: "950.00" }, balances: [{ id: 1, name: account.name, effective: "950.00", projected: "950.00" }], categories: [{ name: "Alimentação", completed: "50.00", pending: "0.00" }], months: [], trend: [{ month: "2026-09", income: "2800.00", expense: "800.00" }, { month: "2026-10", income: "3000.00", expense: "50.00" }], recent: [transaction], budgets: [], previous: { expense: "800.00" } },
  settings: { default_account_id: 1, default_payment_method: "pix", theme: "light" },
  "chat/messages": { state: { pending: null, context: null }, messages: [{ id: 1, role: "user", content: "50 lanche" }, { id: 2, role: "assistant", content: "Despesa registrada com sucesso!", payload: JSON.stringify({ presentation: { kind: "transactions_created", items: [summary] } }) }] },
};

test("páginas autenticadas e controles visuais", async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-10-28T15:00:00Z"));
  await page.route("**/api/v1/**", async (route) => {
    const key = new URL(route.request().url()).pathname.replace("/api/v1/", "");
    if (key === "settings" && route.request().method() === "PUT") response.settings = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response[key] ?? {}) });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Visão geral" }).first()).toBeVisible();
  for (const name of ["Visão geral", "Movimentações", "Categorias", "Orçamentos", "Recorrências", "Assistente", "Configurações"]) {
    const navButton = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name });
    await navButton.click();
    await expect(navButton).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: testInfo.outputPath(`desktop-${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Perfil de Usuário de teste" }).click();
  await expect(page.getByRole("menuitem", { name: "Sair" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Configurações" }).click();
  await expect(page.getByRole("heading", { name: "Configurações" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Perfil de Usuário de teste" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Movimentações" }).click();
  await page.getByRole("combobox", { name: "Tipo" }).click();
  await expect(page.getByRole("option", { name: "Despesa" })).toBeVisible();
  await page.getByRole("option", { name: "Despesa" }).click();
  await expect(page.getByRole("combobox", { name: "Tipo" })).toContainText("Despesa");
  await page.getByRole("combobox", { name: "Tipo" }).click();
  await page.getByRole("option", { name: "Todos" }).click();
  await expect(page.getByRole("combobox", { name: "Tipo" })).toContainText("Todos");
  await page.getByRole("button", { name: "Selecionar período" }).click();
  await expect(page.getByRole("menuitem", { name: "Out" })).toBeVisible();
  const periodRequest = page.waitForRequest((request) => request.url().includes("dashboard?start=2026-09-01"));
  await page.getByRole("menuitem", { name: "Set" }).click();
  await periodRequest;
  await expect(page.getByRole("button", { name: "Selecionar período" })).toContainText("Set 2026");
  await page.getByRole("button", { name: "Abrir assistente" }).click();
  await expect(page.getByText("Despesa registrada com sucesso!")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("desktop-chat-lateral.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: testInfo.outputPath("mobile-chat-lateral.png"), fullPage: true });
  await page.getByRole("button", { name: "Fechar assistente" }).click();
  for (const name of ["Movimentações", "Configurações", "Assistente", "Visão geral"]) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name }).click();
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`mobile-${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.png`), fullPage: true });
  }
  await page.waitForTimeout(150);
  await page.screenshot({ path: testInfo.outputPath("mobile-dashboard.png"), fullPage: true });
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: testInfo.outputPath("mobile-dashboard-dark.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  const logoutRequest = page.waitForRequest((request) => request.url().includes("/api/v1/auth/logout") && request.method() === "POST");
  await page.getByRole("button", { name: "Perfil de Usuário de teste" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await logoutRequest;
  await expect(page.getByRole("button", { name: "Entrar na minha conta" })).toBeVisible();
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.screenshot({ path: testInfo.outputPath("login-after-redesign.png"), fullPage: true });
});

test("chat só apresenta o cartão após a confirmação da API", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-28T15:00:00Z"));
  const fixture = { ...response, "chat/messages": { state: { pending: null, context: null }, messages: [] as unknown[] } };
  let releaseCommand!: () => void;
  const commandGate = new Promise<void>((resolve) => { releaseCommand = resolve; });
  await page.route("**/api/v1/**", async (route) => {
    const key = new URL(route.request().url()).pathname.replace("/api/v1/", "");
    if (key === "chat/commands" && route.request().method() === "POST") {
      await commandGate;
      fixture["chat/messages"] = { state: { pending: null, context: null }, messages: [{ id: 1, role: "user", content: "50 lanche" }, { id: 2, role: "assistant", content: "Despesa registrada com sucesso!", payload: JSON.stringify({ presentation: { kind: "transactions_created", items: [summary] } }) }] };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reply: "Despesa registrada com sucesso!", presentation: { kind: "transactions_created", items: [summary] } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture[key] ?? {}) });
  });
  await page.goto("/");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Assistente" }).click();
  await page.getByRole("textbox", { name: "Mensagem" }).fill("50 lanche");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Processando sua mensagem…")).toBeVisible();
  await expect(page.getByText("Despesa registrada com sucesso!")).toHaveCount(0);
  releaseCommand();
  await expect(page.getByText("Despesa registrada com sucesso!")).toBeVisible();
  await expect(page.getByLabel("Resumo da movimentação Lanche de teste")).toBeVisible();
});
