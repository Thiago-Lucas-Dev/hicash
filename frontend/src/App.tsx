import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Wallet,
  MessageCircle,
  Settings as SettingsIcon,
  Repeat2,
  Plus,
  Pencil,
  Trash2,
  Moon,
  Sun,
  Menu,
  X,
  Send,
  Check,
  TrendingUp,
  TrendingDown,
  Maximize2,
  Info,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  brl,
  json,
  today,
  resetCsrf,
  type AuthUser,
  type Account,
  type Category,
  type Transaction,
  type Dashboard,
} from "./lib/api";
import { AppSelect, Button, Card, ConfirmDialog, Field, Input, Modal } from "./components/ui";
import { BrandLogo } from "./components/BrandLogo";
import { LoginPage } from "./components/LoginPage";
import { PeriodPicker, UserProfile } from "./components/TopbarControls";
import { ChatResult } from "./components/ChatResult";
import { interpret } from "./chatbot/command-handler.js";

type Page =
  | "dashboard"
  | "transactions"
  | "categories"
  | "budgets"
  | "recurrences"
  | "chat"
  | "settings";
type Recurrence = {
  id: number;
  account_id: number;
  category_id: number;
  type: "income" | "expense";
  description: string;
  amount: string;
  payment_method: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  active: boolean;
};
type Transfer = {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: string;
  reference_date: string;
  note?: string;
};
type Alias = { id: number; keyword: string; category_id: number };
type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  payload?: string;
};
type ChatState = { pending?: string | null; context?: string | null };
type Settings = {
  default_account_id?: number | null;
  default_payment_method?: string;
  theme?: "light" | "dark";
};
type FormKind =
  "account" | "transaction" | "transfer" | "category" | "budget" | "recurrence";

const menu: { id: Page; label: string; icon: typeof Wallet }[] = [
  { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { id: "transactions", label: "Movimentações", icon: ArrowLeftRight },
  { id: "categories", label: "Categorias", icon: Tags },
  { id: "budgets", label: "Orçamentos", icon: Wallet },
  { id: "recurrences", label: "Recorrências", icon: Repeat2 },
  { id: "chat", label: "Assistente", icon: MessageCircle },
  { id: "settings", label: "Configurações", icon: SettingsIcon },
];
const paymentOptions = [
  ["pix", "Pix"],
  ["debit", "Débito"],
  ["cash", "Dinheiro"],
  ["bank_transfer", "Transferência bancária"],
  ["credit_card", "Cartão de crédito"],
];
const empty = {
  account: { name: "", opening_balance: "0.00" },
  transaction: {
    type: "expense",
    description: "",
    amount: "",
    category_id: "",
    account_id: "",
    reference_date: today(),
    status: "completed",
    payment_method: "pix",
    note: "",
  },
  transfer: {
    from_account_id: "",
    to_account_id: "",
    amount: "",
    reference_date: today(),
    note: "",
  },
  category: { name: "", type: "expense", essential: false },
  budget: {
    category_id: "",
    year: Number(today().slice(0, 4)),
    month: Number(today().slice(5, 7)),
    amount: "",
    alert_percent: 80,
  },
  recurrence: {
    type: "expense",
    description: "",
    amount: "",
    category_id: "",
    account_id: "",
    payment_method: "pix",
    frequency: "monthly",
    start_date: today(),
    end_date: "",
    active: true,
  },
};
const dateLabel = (date: string) =>
  date ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const nameOf = (items: { id: number; name: string }[], id: number) =>
  items.find((x) => x.id === id)?.name || "—";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unauthorized = () => setUser(null);
    window.addEventListener('hicash:unauthorized', unauthorized);
    api<{ user: AuthUser }>('auth/me')
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
    return () => window.removeEventListener('hicash:unauthorized', unauthorized);
  }, []);

  useEffect(() => {
    if (!user) document.documentElement.classList.remove("dark");
  }, [user]);

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-canvas text-ink">Carregando HiCash…</div>;
  if (!user) return <LoginPage onLogin={setUser} />;

  return <FinanceApp user={user} onLogout={() => setUser(null)} />;
}

function FinanceApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [floatingChat, setFloatingChat] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<Settings>({
    default_payment_method: "pix",
    theme: "light",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatState, setChatState] = useState<ChatState | null>(null);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    account_id: "",
    category_id: "",
    payment_method: "",
  });
  const [kind, setKind] = useState<FormKind | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [future, setFuture] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ route: string; id: number } | null>(null);

  const period = useMemo(
    () => ({
      start: `${month}-01`,
      end: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
        .toISOString()
        .slice(0, 10),
    }),
    [month],
  );
  const reload = useCallback(async () => {
    try {
      const query = new URLSearchParams(period).toString();
      const [a, c, t, tr, r, al, d, s, h] = await Promise.all([
        api<Account[]>("accounts"),
        api<Category[]>("categories"),
        api<Transaction[]>("transactions"),
        api<Transfer[]>("transfers"),
        api<Recurrence[]>("recurrences"),
        api<Alias[]>("categories/aliases"),
        api<Dashboard>(`dashboard?${query}`),
        api<Settings>("settings"),
        api<{ messages: ChatMessage[]; state: ChatState }>("chat/messages"),
      ]);
      setAccounts(a);
      setCategories(c);
      setTransactions(t);
      setTransfers(tr);
      setRecurrences(r);
      setAliases(al);
      setDashboard(d);
      setSettings(s);
      setMessages(h.messages);
      setChatState(h.state);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar os dados. Inicie a API Laravel.",
      );
    }
  }, [period]);
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      settings.theme === "dark",
    );
  }, [settings.theme]);
  const closeFloatingChat = () => {
    setFloatingChat(false);
    requestAnimationFrame(() => document.getElementById("open-assistant")?.focus());
  };
  useEffect(() => {
    if (!floatingChat) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeFloatingChat(); };
    const previousOverflow = document.body.style.overflow;
    if (window.matchMedia("(max-width: 639px)").matches) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [floatingChat]);

  const mutate = async (path: string, method: string, body?: unknown) => {
    setLoading(true);
    try {
      await api(path, body === undefined ? { method } : json(method, body));
      await reload();
      setKind(null);
      setError("");
      setNotice(method === "DELETE" ? "Item excluído com sucesso." : "Alterações salvas com sucesso.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
      setNotice("");
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => {
    try {
      await api('auth/logout', { method: 'POST' });
    } catch {
      // A sessão local deve ser encerrada mesmo se o servidor estiver indisponível.
    } finally {
      resetCsrf();
      onLogout();
    }
  };
  const openForm = (nextKind: FormKind, record?: Record<string, unknown>) => {
    setKind(nextKind);
    setEditing((record?.id as number) || null);
    setFuture(false);
    setError("");
    setForm(
      record
        ? { ...record }
        : {
            ...empty[nextKind],
            account_id: settings.default_account_id || accounts[0]?.id || "",
            from_account_id: accounts[0]?.id || "",
            to_account_id: accounts[1]?.id || "",
            ...(nextKind === "budget"
              ? {
                  year: Number(month.slice(0, 4)),
                  month: Number(month.slice(5, 7)),
                }
              : {}),
          },
    );
  };
  const saveForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!kind) return;
    const route = {
      account: "accounts",
      transaction: "transactions",
      transfer: "transfers",
      category: "categories",
      budget: "budgets",
      recurrence: "recurrences",
    }[kind];
    const payload = { ...form };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.deleted_at;
    delete payload.category_name;
    delete payload.origin;
    delete payload.recurrence_rule_id;
    delete payload.occurrence_date;
    if (kind === "recurrence" && !payload.end_date) payload.end_date = null;
    if (kind === "transaction" && !payload.note) payload.note = null;
    if (kind === "transfer" && !payload.note) payload.note = null;
    if (editing && kind === "recurrence" && future) {
      await mutate(`recurrences/${editing}/future`, "POST", {
        ...payload,
        effective_date: form.effective_date || today(),
      });
    } else
      await mutate(
        editing ? `${route}/${editing}` : route,
        editing ? "PUT" : "POST",
        payload,
      );
  };
  const remove = async (route: string, id: number) => {
    setDeleteTarget({ route, id });
  };
  const toggleTheme = async () => {
    const next: Settings = {
      ...settings,
      theme: settings.theme === "dark" ? "light" : "dark",
    };
    setSettings(next);
    await mutate("settings", "PUT", {
      default_account_id: next.default_account_id || null,
      default_payment_method: next.default_payment_method || "pix",
      theme: next.theme,
    });
  };
  const filtered = transactions.filter(
    (t) =>
      Object.entries(filters).every(
        ([key, value]) =>
          !value || String(t[key as keyof Transaction]) === value,
      ) && t.reference_date.startsWith(month),
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {mobileMenu && <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={() => setMobileMenu(false)} />}
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside
          className={`${mobileMenu ? "fixed inset-y-0 left-0 z-40" : "hidden"} w-64 shrink-0 border-r border-outline bg-surface px-3 py-5 md:sticky md:top-0 md:block md:h-screen md:px-4 md:py-7`}
        >
          <div className="mb-10 flex items-center justify-between px-3">
            <BrandLogo theme={settings.theme} className="w-36" />
            <Button
              variant="ghost"
              className="min-h-8 px-2 md:hidden"
              aria-label="Fechar menu"
              onClick={() => setMobileMenu(false)}
            >
              <X size={18} />
            </Button>
          </div>
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.13em] text-muted">Menu principal</p>
          <nav aria-label="Navegação principal" className="space-y-1">
            {menu.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setMobileMenu(false);
                }}
                aria-current={page === item.id ? "page" : undefined}
                className={`group flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] border-l-[3px] px-3 py-2 text-left text-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-focus ${page === item.id ? "border-brand bg-brand-subtle font-semibold text-action dark:bg-brand-soft dark:text-finance-positive" : "border-transparent font-medium text-muted hover:bg-surface-subtle hover:text-ink"}`}
              >
                <item.icon size={18} strokeWidth={page === item.id ? 2.2 : 1.9} className="shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-10 border-t border-outline px-3 pt-5 text-xs font-medium text-muted">HiCash · Finanças pessoais</div>
        </aside>
        <main className="min-w-0 flex-1 pb-28 md:pb-12">
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-outline bg-surface/95 px-4 py-3 backdrop-blur sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                className="min-h-9 px-2 md:hidden"
                aria-label="Abrir menu"
                onClick={() => setMobileMenu(true)}
              >
                <Menu size={20} />
              </Button>
              <BrandLogo compact className="md:hidden" />
              <div>
                <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                  {menu.find((x) => x.id === page)?.label}
                </h1>
                <p className="hidden text-xs text-muted sm:block">
                  Seu dinheiro, com clareza.
                </p>
              </div>
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <PeriodPicker value={month} onChange={setMonth} />
              <Button
                variant="ghost"
                aria-label="Alternar tema"
                onClick={toggleTheme}
              >
                {settings.theme === "dark" ? (
                  <Sun size={19} />
                ) : (
                  <Moon size={19} />
                )}
              </Button>
              <span aria-hidden="true" className="mx-1 hidden h-7 w-px bg-outline sm:block" />
              <UserProfile user={user} onSettings={() => { setPage("settings"); setMobileMenu(false); }} onLogout={logout} />
            </div>
          </header>
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-7 lg:p-9">
            {notice && <div role="status" className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-brand/20 bg-brand-subtle px-4 py-3 text-sm text-action dark:bg-brand-soft dark:text-finance-positive"><span>{notice}</span><button type="button" aria-label="Dispensar aviso" onClick={() => setNotice("")}><X size={16} /></button></div>}
            {error && (
              <div
                role="alert"
                className="rounded-[var(--radius-control)] border border-danger/25 bg-danger-soft p-4 text-sm text-danger-ink"
              >
                {error}
              </div>
            )}
            {page === "dashboard" && (
              <DashboardPage
                data={dashboard}
                transactions={transactions}
                categories={categories}
                onAdd={() => openForm("transaction")}
                onChat={() => setPage("chat")}
              />
            )}
            {page === "transactions" && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Movimentações</h2>
                    <p className="mt-1 text-sm text-muted">
                      Receitas, despesas e transferências.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => openForm("transfer")}
                    >
                      <ArrowLeftRight size={16} /> Transferir
                    </Button>
                    <Button onClick={() => openForm("transaction")}>
                      <Plus size={16} /> Lançamento
                    </Button>
                  </div>
                </div>
                <Card>
                  <div className="mb-5 grid gap-3 border-b border-outline pb-5 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      [
                        "type",
                        "Tipo",
                        [
                          ["", "Todos"],
                          ["income", "Receita"],
                          ["expense", "Despesa"],
                        ],
                      ],
                      [
                        "status",
                        "Status",
                        [
                          ["", "Todos"],
                          ["completed", "Concluído"],
                          ["pending", "Pendente"],
                        ],
                      ],
                      [
                        "account_id",
                        "Conta",
                        [
                          ["", "Todas"],
                          ...accounts.map((a) => [String(a.id), a.name]),
                        ],
                      ],
                      [
                        "category_id",
                        "Categoria",
                        [
                          ["", "Todas"],
                          ...categories.map((c) => [String(c.id), c.name]),
                        ],
                      ],
                      [
                        "payment_method",
                        "Pagamento",
                        [["", "Todos"], ...paymentOptions],
                      ],
                    ].map(([key, label, opts]) => (
                      <Field key={key as string} label={label as string}>
                        <AppSelect
                          value={filters[key as keyof typeof filters]}
                          onValueChange={(value) =>
                            setFilters({
                              ...filters,
                              [key as string]: value,
                            })
                          }
                          options={(opts as string[][]).map(([value, label]) => ({ value, label }))}
                          ariaLabel={label as string}
                        />
                      </Field>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-[var(--radius-control)] border border-outline">
                    <table className="finance-table">
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Data</th>
                          <th>Categoria</th>
                          <th>Conta</th>
                          <th>Status</th>
                          <th>Valor</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((t) => (
                          <tr key={t.id}>
                            <td data-label="Descrição" className="font-medium">
                              {t.description}
                              <div className="text-xs text-muted">
                                {
                                  paymentOptions.find(
                                    (x) => x[0] === t.payment_method,
                                  )?.[1]
                                }
                              </div>
                            </td>
                            <td data-label="Data">{dateLabel(t.reference_date)}</td>
                            <td data-label="Categoria">{nameOf(categories, t.category_id)}</td>
                            <td data-label="Conta">{nameOf(accounts, t.account_id)}</td>
                            <td data-label="Status">
                              <span
                              className={`rounded-[var(--radius-small)] px-2 py-1 text-xs font-medium ${t.status === "completed" ? "bg-brand-subtle text-action dark:bg-brand-soft dark:text-finance-positive" : "bg-warning-soft text-warning"}`}
                              >
                                {t.status === "completed"
                                  ? "Concluído"
                                  : "Pendente"}
                              </span>
                            </td>
                            <td data-label="Valor"
                              className={`money ${
                                t.type === "income"
                                  ? "font-bold text-finance-positive"
                                  : "font-bold text-finance-negative"
                              }`}
                            >
                              {t.type === "income" ? "+" : "−"} {brl(t.amount)}
                            </td>
                            <td data-label="Ações">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  aria-label={`Editar ${t.description}`}
                                  title="Editar movimentação"
                                  onClick={() =>
                                    openForm(
                                      "transaction",
                                      t as unknown as Record<string, unknown>,
                                    )
                                  }
                                >
                                  <Pencil size={16} />
                                </Button>
                                {t.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    aria-label={`Concluir ${t.description}`}
                                    title="Concluir movimentação"
                                    onClick={() =>
                                      mutate(
                                        `transactions/${t.id}/status`,
                                        "POST",
                                        { status: "completed" },
                                      )
                                    }
                                  >
                                    <Check size={16} />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  aria-label={`Excluir ${t.description}`}
                                  title="Excluir movimentação"
                                  className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                                  onClick={() => remove("transactions", t.id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filtered.length && (
                      <p className="py-8 text-center text-muted">
                        Nenhum lançamento neste período.
                      </p>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-3 text-base font-semibold">Transferências internas</h3>
                  <div className="space-y-2">
                    {transfers
                      .filter((t) => t.reference_date.startsWith(month))
                      .map((t) => (
                        <div
                          key={t.id}
                          className="data-row flex flex-wrap items-center justify-between gap-2 border-b border-outline py-3 text-sm"
                        >
                          <span>
                            {nameOf(accounts, t.from_account_id)} →{" "}
                            {nameOf(accounts, t.to_account_id)}{" "}
                            <span className="text-muted">
                              · {dateLabel(t.reference_date)}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 font-semibold">
                            {brl(t.amount)}
                            <Button
                              variant="ghost"
                              onClick={() =>
                                openForm(
                                  "transfer",
                                  t as unknown as Record<string, unknown>,
                                )
                              }
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => remove("transfers", t.id)}
                            >
                              <Trash2 size={15} />
                            </Button>
                          </span>
                        </div>
                      ))}
                    {!transfers.length && (
                      <p className="text-sm text-muted">
                        Nenhuma transferência.
                      </p>
                    )}
                  </div>
                </Card>
              </section>
            )}
            {page === "categories" && (
              <section className="space-y-5">
                <PageHeading
                  title="Categorias"
                  description="Organize receitas e despesas."
                  action="Nova categoria"
                  onAction={() => openForm("category")}
                />
                <div className="grid items-start gap-5 lg:grid-cols-2">
                  {(["expense", "income"] as const).map((type) => (
                    <Card key={type}>
                      <div className="mb-3 flex items-center justify-between gap-2 border-b border-outline pb-4"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-[var(--radius-control)] ${type === "expense" ? "bg-danger-soft text-finance-negative" : "bg-brand-subtle text-finance-positive dark:bg-brand-soft"}`}>{type === "expense" ? <TrendingDown size={18} /> : <TrendingUp size={18} />}</span><h3 className="text-base font-semibold">{type === "expense" ? "Despesas" : "Receitas"}</h3></div><span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-muted">{categories.filter((c) => c.type === type).length}</span></div>
                      {!categories.some((c) => c.type === type) && <p className="py-6 text-sm text-muted">Nenhuma categoria cadastrada.</p>}
                      {categories
                        .filter((c) => c.type === type)
                        .map((c) => (
                          <div
                            key={c.id}
                            className="data-row flex items-center justify-between gap-2 border-b border-outline py-3 text-sm"
                          >
                            <span className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
                              {c.name}
                              {c.essential && (
                                <span className="rounded-[var(--radius-small)] bg-brand-subtle px-2 py-1 text-xs font-medium text-action dark:bg-brand-soft dark:text-finance-positive">
                                  Essencial
                                </span>
                              )}
                            </span>
                            <span>
                              <Button aria-label={`Editar categoria ${c.name}`} title="Editar categoria"
                                variant="ghost"
                                onClick={() =>
                                  openForm(
                                    "category",
                                    c as unknown as Record<string, unknown>,
                                  )
                                }
                              >
                                <Pencil size={15} />
                              </Button>
                              <Button aria-label={`Excluir categoria ${c.name}`} title="Excluir categoria" className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                                variant="ghost"
                                onClick={() => remove("categories", c.id)}
                              >
                                <Trash2 size={15} />
                              </Button>
                            </span>
                          </div>
                        ))}
                    </Card>
                  ))}
                </div>
              </section>
            )}
            {page === "budgets" && (
              <section className="space-y-5">
                <PageHeading
                  title="Orçamentos"
                  description="Acompanhe limites mensais por categoria."
                  action="Definir limite"
                  onAction={() => openForm("budget")}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  {dashboard?.budgets.map((b) => (
                    <Card key={b.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-base font-semibold">{b.category_name}</h3>
                        <span
                          className={
                            `money font-semibold ${b.alert ? "text-finance-negative" : "text-finance-positive"}`
                          }
                        >
                          {b.percent}%
                        </span>
                      </div>
                      <div className="my-4 h-2 rounded-full bg-surface-subtle">
                        <div
                          className={`h-full rounded-full ${b.alert ? "bg-finance-negative" : "bg-finance-positive"}`}
                          style={{ width: `${Math.min(b.percent, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted">
                        Usado {brl(b.used)} · Comprometido {brl(b.committed)} de{" "}
                        {brl(b.amount)}
                      </p>
                      {b.alert && (
                        <p className="mt-2 text-sm font-medium text-finance-negative">
                          {b.percent > 100
                            ? "Limite ultrapassado"
                            : "Alerta de limite atingido"}
                        </p>
                      )}
                      <div className="mt-3 flex gap-1">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            openForm(
                              "budget",
                              b as unknown as Record<string, unknown>,
                            )
                          }
                        >
                          <Pencil size={15} /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => remove("budgets", b.id)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {!dashboard?.budgets.length && (
                    <Card className="flex min-h-72 flex-col items-center justify-center text-center md:col-span-2">
                      <span className="mb-4 grid h-14 w-14 place-items-center rounded-[var(--radius-card)] bg-brand-subtle text-brand dark:bg-brand-soft"><Wallet size={26} /></span>
                      <h3 className="text-lg font-semibold tracking-tight">Organize seus limites mensais</h3>
                      <p className="mt-2 max-w-sm text-sm text-muted">Defina limites por categoria e acompanhe seus gastos ao longo do mês.</p>
                      <Button className="mt-5" onClick={() => openForm("budget")}><Plus size={16} /> Definir meu primeiro limite</Button>
                    </Card>
                  )}
                </div>
              </section>
            )}
            {page === "recurrences" && (
              <section className="space-y-5">
                <PageHeading
                  title="Recorrências"
                  description="As próximas ocorrências são criadas como pendentes."
                  action="Nova recorrência"
                  onAction={() => openForm("recurrence")}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  {recurrences.map((r) => (
                    <Card key={r.id} className="transition-colors hover:border-brand/30">
                        <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{r.description}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.active ? "bg-brand-subtle text-action dark:bg-brand-soft dark:text-finance-positive" : "bg-surface-subtle text-muted"}`}>{r.active ? "Ativa" : "Inativa"}</span></div>
                          <p className="text-sm text-muted">
                            {r.frequency === "monthly"
                              ? "Mensal"
                              : r.frequency === "weekly"
                                ? "Semanal"
                                : "Anual"}{" "}
                            · início {dateLabel(r.start_date)}
                          </p>
                        </div>
                        <strong className={`money text-base ${r.type === "income" ? "text-finance-positive" : "text-finance-negative"}`}>{r.type === "income" ? "+" : "−"} {brl(r.amount)}</strong>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {nameOf(categories, r.category_id)} ·{" "}
                        {nameOf(accounts, r.account_id)}
                      </p>
                      {transactions.filter((t) => t.recurrence_rule_id === r.id && t.status === "pending").sort((a, b) => a.reference_date.localeCompare(b.reference_date))[0] && <p className="mt-2 text-xs font-medium text-warning">Próxima ocorrência pendente: {dateLabel(transactions.filter((t) => t.recurrence_rule_id === r.id && t.status === "pending").sort((a, b) => a.reference_date.localeCompare(b.reference_date))[0].reference_date)}</p>}
                      <div className="mt-4 flex gap-1 border-t border-outline pt-3">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            openForm(
                              "recurrence",
                              r as unknown as Record<string, unknown>,
                            )
                          }
                        >
                          <Pencil size={15} /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => remove("recurrences", r.id)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {!recurrences.length && (
                    <Card className="md:col-span-2">
                      <div className="flex min-h-64 flex-col items-center justify-center text-center"><span className="mb-4 grid h-14 w-14 place-items-center rounded-[var(--radius-card)] bg-brand-subtle text-brand dark:bg-brand-soft"><Repeat2 size={25} /></span><h3 className="text-lg font-semibold">Planeje lançamentos recorrentes</h3><p className="mt-2 max-w-sm text-sm text-muted">Cadastre uma regra para acompanhar as próximas ocorrências.</p><Button className="mt-5" onClick={() => openForm("recurrence")}>Nova recorrência</Button></div>
                    </Card>
                  )}
                </div>
                {transactions.some((t) => t.recurrence_rule_id) && <Card><h3 className="mb-3 text-base font-semibold">Ocorrências geradas</h3><div className="space-y-1">{transactions.filter((t) => t.recurrence_rule_id).slice(0, 10).map((t) => <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-outline py-3 text-sm last:border-0"><div><strong>{t.description}</strong><p className="text-xs text-muted">{dateLabel(t.reference_date)} · {nameOf(accounts, t.account_id)}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${t.status === "pending" ? "bg-warning-soft text-warning" : "bg-brand-subtle text-finance-positive dark:bg-brand-soft"}`}>{t.status === "pending" ? "Pendente" : "Concluída"}</span><strong className={`money ${t.type === "expense" ? "text-finance-negative" : "text-finance-positive"}`}>{brl(t.amount)}</strong>{t.status === "pending" && <Button variant="secondary" onClick={() => mutate(`transactions/${t.id}/status`, "POST", { status: "completed" })}>Concluir</Button>}</div></div>)}</div></Card>}
              </section>
            )}
            {page === "chat" && (
              <section className="mx-auto max-w-5xl space-y-5">
                <PageHeading title="Assistente HiCash" description="Converse sobre suas finanças ou registre movimentações com linguagem natural." />
                <ChatPanel
                  messages={messages}
                  chatState={chatState}
                  accounts={accounts}
                  categories={categories}
                  aliases={aliases}
                  settings={settings}
                  onSent={reload}
                  full
                />
              </section>
            )}
            {page === "settings" && (
              <section className="space-y-5">
                <PageHeading
                  title="Configurações"
                  description="Contas, padrões e associações aprendidas."
                />
                <div className="grid items-start gap-5 lg:grid-cols-2">
                  <Card>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold">Contas financeiras</h3>
                      <Button onClick={() => openForm("account")}>
                        <Plus size={15} /> Conta
                      </Button>
                    </div>
                    {accounts.map((a) => (
                      <div
                        key={a.id}
                        className="data-row flex flex-wrap items-center justify-between gap-2 border-b border-outline py-3"
                      >
                        <span className="grid gap-1"><strong className="text-sm">{a.name}</strong><small className="money text-xs text-muted">Saldo inicial {brl(a.opening_balance)}</small></span>
                        <span>
                          <Button
                            variant="ghost"
                            aria-label={`Editar conta ${a.name}`}
                            title="Editar conta"
                            onClick={() =>
                              openForm(
                                "account",
                                a as unknown as Record<string, unknown>,
                              )
                            }
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            aria-label={`Excluir conta ${a.name}`}
                            title="Excluir conta"
                            className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                            onClick={() => remove("accounts", a.id)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </span>
                      </div>
                    ))}
                    {!accounts.length && (
                      <p className="text-sm text-muted">
                        Crie sua primeira conta para começar.
                      </p>
                    )}
                  </Card>
                  <Card>
                    <h3 className="mb-4 text-base font-semibold">Preferências</h3>
                    <p className="mb-4 text-sm text-muted">Escolha a conta e a forma de pagamento sugeridas nos novos lançamentos.</p><div className="space-y-4">
                      <Field label="Conta padrão">
                        <AppSelect
                          value={String(settings.default_account_id || "")}
                          onValueChange={(value) =>
                            setSettings({
                              ...settings,
                              default_account_id:
                                Number(value) || null,
                            })
                          }
                          options={[{ value: "", label: "Primeira conta" }, ...accounts.map((a) => ({ value: String(a.id), label: a.name }))]}
                          ariaLabel="Conta padrão"
                        />
                      </Field>
                      <Field label="Pagamento padrão">
                        <AppSelect
                          value={settings.default_payment_method || "pix"}
                          onValueChange={(value) =>
                            setSettings({
                              ...settings,
                              default_payment_method: value,
                            })
                          }
                          options={paymentOptions.map(([value, label]) => ({ value, label }))}
                          ariaLabel="Pagamento padrão"
                        />
                      </Field>
                      <Button
                        onClick={() =>
                          mutate("settings", "PUT", {
                            default_account_id:
                              settings.default_account_id || null,
                            default_payment_method:
                              settings.default_payment_method || "pix",
                            theme: settings.theme || "light",
                          })
                        }
                      >
                        {loading ? "Salvando…" : "Salvar preferências"}
                      </Button>
                    </div>
                  </Card>
                  <Card className="lg:col-span-2">
                    <h3 className="mb-3 text-base font-semibold">Associações aprendidas</h3>
                    <p className="mb-3 text-sm text-muted">
                      Palavras associadas a categorias após confirmação ou
                      correção.
                    </p>
                    {aliases.map((a) => (
                      <div
                        key={a.id}
                        className="data-row flex flex-wrap items-center justify-between gap-2 border-b border-outline py-3 text-sm"
                      >
                        <span>
                          {a.keyword} → {nameOf(categories, a.category_id)}
                        </span>
                        <Button
                          variant="ghost"
                          aria-label={`Excluir associação ${a.keyword}`}
                          title="Excluir associação"
                          className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                          onClick={() => remove("categories/aliases", a.id)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    ))}
                    {!aliases.length && (
                      <p className="text-sm text-muted">
                        Nenhuma associação aprendida.
                      </p>
                    )}
                  </Card>
                </div>
                <div role="note" className="flex gap-3 rounded-[var(--radius-card)] border border-outline bg-surface-subtle p-4 text-sm text-muted"><Info size={19} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><p>Compras no cartão de crédito entram nas despesas e nos orçamentos, mas não reduzem o saldo bancário. O controle de faturas não está disponível nesta versão.</p></div>
              </section>
            )}
          </div>
        </main>
      </div>
      {page !== "chat" && (
        <>
          <Button
            id="open-assistant"
            aria-label="Abrir assistente"
            className="fixed bottom-4 right-4 z-30 h-12 w-12 rounded-full p-0 shadow-[var(--hicash-shadow-popover)] sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:rounded-[var(--radius-control)] sm:px-4 sm:py-2.5"
            onClick={() => setFloatingChat(true)}
          >
            <MessageCircle size={20} /><span className="hidden sm:inline">Assistente</span>
          </Button>
          {floatingChat && (
            <div
              className="pointer-events-none fixed inset-0 z-40 max-sm:pointer-events-auto max-sm:bg-slate-950/45"
              onClick={(event) => { if (event.target === event.currentTarget) closeFloatingChat(); }}
            >
              <div
                role="dialog"
                aria-label="Assistente HiCash"
                className="pointer-events-auto absolute bottom-0 right-0 h-[100dvh] w-full overflow-hidden border border-outline bg-surface shadow-[var(--hicash-shadow-popover)] sm:bottom-5 sm:right-5 sm:h-[min(82dvh,720px)] sm:w-[440px] sm:rounded-[var(--radius-modal)]"
              >
                <ChatPanel
                  messages={messages}
                  chatState={chatState}
                  accounts={accounts}
                  categories={categories}
                  aliases={aliases}
                  settings={settings}
                  onSent={reload}
                  onClose={closeFloatingChat}
                  onExpand={() => { setFloatingChat(false); setPage("chat"); }}
                />
              </div>
            </div>
          )}
        </>
      )}
      <ConfirmDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} loading={loading} onConfirm={() => { if (deleteTarget) { void mutate(`${deleteTarget.route}/${deleteTarget.id}`, "DELETE"); setDeleteTarget(null); } }} />
      <Modal
        open={kind !== null}
        onOpenChange={(v) => !v && setKind(null)}
        title={`${editing ? "Editar" : "Novo"} ${kind === "account" ? "conta" : kind === "transaction" ? "lançamento" : kind === "transfer" ? "transferência" : kind === "category" ? "categoria" : kind === "budget" ? "orçamento" : "recorrência"}`}
      >
        {kind && (
          <form onSubmit={saveForm} className="grid gap-4 sm:grid-cols-2">
            <FinanceFields
              kind={kind}
              form={form}
              setForm={setForm}
              accounts={accounts}
              categories={categories}
            />
            {kind === "recurrence" && editing && (
              <div className="sm:col-span-2 space-y-3">
                <Field label="Aplicar alterações">
                  <AppSelect
                    value={future ? "future" : "rule"}
                    onValueChange={(value) => setFuture(value === "future")}
                    options={[{ value: "rule", label: "Próximas gerações da regra" }, { value: "future", label: "Todas as ocorrências futuras" }]}
                    ariaLabel="Aplicar alterações"
                  />
                </Field>
                {future && (
                  <Field label="A partir de">
                    <Input
                      type="date"
                      value={String(form.effective_date || today())}
                      onChange={(e) =>
                        setForm({ ...form, effective_date: e.target.value })
                      }
                    />
                  </Field>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger-ink sm:col-span-2">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-outline pt-4 sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setKind(null)}
              >
                Cancelar
              </Button>
              <Button disabled={loading} type="submit">
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function PageHeading({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {action && (
        <Button onClick={onAction}>
          <Plus size={16} />
          {action}
        </Button>
      )}
    </div>
  );
}

function FinanceFields({
  kind,
  form,
  setForm,
  accounts,
  categories,
}: {
  kind: FormKind;
  form: Record<string, unknown>;
  setForm: (f: Record<string, unknown>) => void;
  accounts: Account[];
  categories: Category[];
}) {
  const value = (key: string) => String(form[key] ?? "");
  const set = (key: string, v: unknown) => setForm({ ...form, [key]: v });
  const field = (
    label: string,
    key: string,
    type = "text",
    required = true,
  ) => (
    <Field label={label}>
      <Input
        type={type}
        required={required}
        value={value(key)}
        onChange={(e) => set(key, e.target.value)}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
      />
    </Field>
  );
  const select = (label: string, key: string, options: [string, string][]) => (
    <Field label={label}>
      <AppSelect
        required
        value={value(key)}
        onValueChange={(next) => set(key, next)}
        options={[{ value: "", label: "Selecione" }, ...options.map(([v, l]) => ({ value: v, label: l }))]}
        ariaLabel={label}
      />
    </Field>
  );
  const accountOptions = accounts.map(
    (a) => [String(a.id), a.name] as [string, string],
  );
  const categoryOptions = categories
    .filter((c) => c.type === (form.type || "expense"))
    .map((c) => [String(c.id), c.name] as [string, string]);
  if (kind === "account")
    return (
      <>
        {field("Nome", "name")}
        {field("Saldo inicial", "opening_balance", "number")}
      </>
    );
  if (kind === "category")
    return (
      <>
        {field("Nome", "name")}
        {select("Tipo", "type", [
          ["expense", "Despesa"],
          ["income", "Receita"],
        ])}
        <Field label="Classificação">
          <AppSelect
            value={form.essential ? "yes" : "no"}
            onValueChange={(next) => set("essential", next === "yes")}
            options={[{ value: "no", label: "Não essencial" }, { value: "yes", label: "Essencial" }]}
            ariaLabel="Classificação"
          />
        </Field>
      </>
    );
  if (kind === "budget")
    return (
      <>
        {select(
          "Categoria",
          "category_id",
          categories
            .filter((c) => c.type === "expense")
            .map((c) => [String(c.id), c.name]),
        )}
        {field("Limite", "amount", "number")}
        {field("Ano", "year", "number")}
        {field("Mês", "month", "number")}
        {field("Alerta (%)", "alert_percent", "number")}
      </>
    );
  if (kind === "transfer")
    return (
      <>
        {select("De", "from_account_id", accountOptions)}
        {select("Para", "to_account_id", accountOptions)}
        {field("Valor", "amount", "number")}
        {field("Data", "reference_date", "date")}
        {field("Observação", "note", "text", false)}
      </>
    );
  return (
    <>
      {select("Tipo", "type", [
        ["expense", "Despesa"],
        ["income", "Receita"],
      ])}
      {field("Descrição", "description")}
      {field("Valor", "amount", "number")}
      {select("Categoria", "category_id", categoryOptions)}
      {select("Conta", "account_id", accountOptions)}
      {select(
        "Pagamento",
        "payment_method",
        paymentOptions as [string, string][],
      )}
      {kind === "transaction" ? (
        <>
          {field("Data", "reference_date", "date")}
          {select("Status", "status", [
            ["completed", "Concluído"],
            ["pending", "Pendente"],
          ])}
          {field("Observação", "note", "text", false)}
        </>
      ) : (
        <>
          {select("Frequência", "frequency", [
            ["monthly", "Mensal"],
            ["weekly", "Semanal"],
            ["yearly", "Anual"],
          ])}
          {field("Início", "start_date", "date")}
          {field("Fim (opcional)", "end_date", "date", false)}
          <Field label="Ativa">
            <AppSelect
              value={form.active ? "yes" : "no"}
              onValueChange={(next) => set("active", next === "yes")}
              options={[{ value: "yes", label: "Sim" }, { value: "no", label: "Não" }]}
              ariaLabel="Ativa"
            />
          </Field>
        </>
      )}
    </>
  );
}

function DashboardPage({
  data,
  transactions,
  categories,
  onAdd,
  onChat,
}: {
  data: Dashboard | null;
  transactions: Transaction[];
  categories: Category[];
  onAdd: () => void;
  onChat: () => void;
}) {
  const effective = data?.balance_totals.effective || "0.00";
  const projected = data?.balance_totals.projected || "0.00";
  const categoryChart =
    data?.categories
      .map((c) => ({ name: c.name, value: Number(c.completed) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) || [];
  const metrics = [
    {
      label: "Saldo efetivo",
      value: effective,
      Icon: Wallet,
      color: "text-ink",
      accent: "bg-surface-subtle text-ink",
    },
    {
      label: "Saldo previsto",
      value: projected,
      Icon: TrendingUp,
      color: "text-ink",
      accent: "bg-brand-subtle text-action dark:bg-brand-soft dark:text-finance-positive",
    },
    {
      label: "Receitas",
      value: data?.totals.income || 0,
      Icon: TrendingUp,
      color: "text-finance-positive",
      accent: "bg-brand-subtle text-action dark:bg-brand-soft dark:text-finance-positive",
    },
    {
      label: "Despesas",
      value: data?.totals.expense || 0,
      Icon: TrendingDown,
      color: "text-finance-negative",
      accent: "bg-danger-soft text-finance-negative",
    },
  ];
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Bem-vindo às suas finanças</h2>
          <p className="mt-1 text-sm text-muted">
            Resumo do período selecionado.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onChat}>
            <MessageCircle size={16} /> Perguntar
          </Button>
          <Button onClick={onAdd}>
            <Plus size={16} /> Lançamento
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, Icon, color, accent }, index) => (
          <Card key={label} className={`min-w-0 ${index === 0 ? "border-brand/25 bg-gradient-to-br from-brand-subtle to-surface dark:from-brand-soft dark:to-surface" : ""}`}>
            <div className="mb-5 flex items-center justify-between gap-2 text-sm font-medium text-muted">
              <span>{label}</span>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${accent}`}><Icon size={18} strokeWidth={1.9} /></span>
            </div>
            <div className={`money truncate text-[clamp(1.45rem,2vw,1.9rem)] font-bold leading-tight tracking-tight ${color}`} title={brl(value)}>
              {brl(value)}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-base font-semibold">Despesas por categoria</h3>
          <p className="mb-5 text-xs text-muted">Distribuição dos gastos concluídos</p>
          <div className="h-64">
            {categoryChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChart}
                  layout="vertical"
                  margin={{ left: 15, right: 10 }}
                >
                  <CartesianGrid stroke="var(--hicash-border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--hicash-slate)" }} tickFormatter={(n) => `R$ ${n}`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: "var(--hicash-slate)" }} />
                  <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ background: "var(--hicash-surface)", border: "1px solid var(--hicash-border)", borderRadius: "7px", color: "var(--hicash-charcoal)" }} />
                  <Bar dataKey="value" name="Despesas" fill="var(--hicash-expense)" radius={[0, 5, 5, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </Card>
        <Card>
          <h3 className="mb-1 text-base font-semibold">Evolução mensal</h3>
          <p className="mb-5 text-xs text-muted">Receitas e despesas ao longo do tempo</p>
          <div className="h-64">
            {data?.trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trend.map((m) => ({
                    ...m,
                    income: Number(m.income),
                    expense: Number(m.expense),
                  }))}
                >
                  <CartesianGrid stroke="var(--hicash-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "var(--hicash-slate)" }} />
                  <YAxis tick={{ fill: "var(--hicash-slate)" }} />
                  <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ background: "var(--hicash-surface)", border: "1px solid var(--hicash-border)", borderRadius: "7px", color: "var(--hicash-charcoal)" }} />
                  <Legend verticalAlign="top" height={28} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Receitas"
                    stroke="var(--hicash-success)"
                    fill="var(--hicash-green-soft)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Despesas"
                    stroke="var(--hicash-expense)"
                    fill="var(--hicash-expense-soft)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            Mês anterior: despesas {brl(data?.previous.expense || 0)}
          </p>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-base font-semibold">Saldos por conta</h3>
          {data?.balances.map((a) => (
            <div
              key={a.id}
              className="data-row flex flex-wrap justify-between gap-2 border-b border-outline py-3 text-sm"
            >
              <span>{a.name}</span>
              <span className="money">
                <strong>{brl(a.effective)}</strong>
                <small className="ml-2 text-muted">
                  Previsto {brl(a.projected)}
                </small>
              </span>
            </div>
          ))}
          {!data?.balances.length && (
            <p className="text-sm text-muted">
              Cadastre uma conta para começar.
            </p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 text-base font-semibold">Limites em acompanhamento</h3>
          {data?.budgets.map((b) => (
            <div key={b.id} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <span>{b.category_name}</span>
                <span>{b.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-subtle">
                <div
                  className={`h-full rounded-full ${b.alert ? "bg-finance-negative" : "bg-finance-positive"}`}
                  style={{ width: `${Math.min(100, b.percent)}%` }}
                />
              </div>
            </div>
          ))}
          {!data?.budgets.length && (
            <p className="text-sm text-muted">Nenhum limite neste mês.</p>
          )}
        </Card>
      </div>
      <Card>
        <h3 className="mb-3 text-base font-semibold">Movimentações recentes</h3>
        <div className="space-y-2">
          {data?.recent.map((t) => (
            <div
              key={t.id}
              className="data-row flex flex-wrap justify-between gap-2 border-b border-outline py-3 text-sm"
            >
              <span>
                {t.description}
                <small className="ml-2 text-muted">
                  {nameOf(categories, t.category_id)} ·{" "}
                  {dateLabel(t.reference_date)}
                </small>
              </span>
              <strong
                className={
                  `money ${t.type === "income" ? "text-finance-positive" : "text-finance-negative"}`
                }
              >
                {t.type === "income" ? "+" : "−"} {brl(t.amount)}
              </strong>
            </div>
          ))}
          {!transactions.length && (
            <p className="text-sm text-muted">
              Nenhuma movimentação ainda.
            </p>
          )}
        </div>
      </Card>
      <p className="text-xs text-muted">
        Despesas no cartão entram nos gastos, mas não reduzem o saldo bancário
        nesta versão.
      </p>
    </section>
  );
}
function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      Dados aparecerão após seus primeiros lançamentos.
    </div>
  );
}

function ChatPanel({
  messages,
  chatState,
  accounts,
  categories,
  aliases,
  settings,
  onSent,
  full = false,
  onClose,
  onExpand,
}: {
  messages: ChatMessage[];
  chatState: ChatState | null;
  accounts: Account[];
  categories: Category[];
  aliases: Alias[];
  settings: Settings;
  onSent: () => Promise<void>;
  full?: boolean;
  onClose?: () => void;
  onExpand?: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollArea = useRef<HTMLDivElement>(null);
  const pending = chatState?.pending ? JSON.parse(chatState.pending) : null;
  const contextHistory = chatState?.context
    ? JSON.parse(chatState.context)
    : [];
  const context = Array.isArray(contextHistory)
    ? contextHistory.at(-1)
    : contextHistory;
  useEffect(() => { if (scrollArea.current) scrollArea.current.scrollTop = scrollArea.current.scrollHeight; }, [messages.length, busy]);
  const send = async (message = text) => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError("");
    setText("");
    try {
      const prepared =
        pending?.kind === "draft" &&
        !/^(cancelar|cancela|não|nao)$/i.test(message.trim())
          ? `${pending.original} ${message}`
          : message;
      const interpretation = interpret(prepared, {
        accounts,
        categories,
        aliases,
        settings,
        pending,
        context,
      });
      await api(
        "chat/commands",
        json("POST", {
          command_id: crypto.randomUUID(),
          message,
          interpretation,
        }),
      );
      await onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar");
      setText(message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden bg-surface ${full ? "h-[max(620px,calc(100dvh-245px))] rounded-[var(--radius-card)] border border-outline shadow-[var(--hicash-shadow)]" : "h-full"}`}
    >
      <div className="flex min-h-[70px] items-center gap-3 border-b border-outline bg-surface px-4 py-3 sm:px-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-brand-subtle dark:bg-brand-soft"><img src="/brand/mark-hicash.png" alt="" width="32" height="32" className="h-8 w-8 object-contain" /></span>
        <div className="min-w-0 flex-1"><strong className="block text-sm font-bold text-ink">Assistente HiCash</strong><span className="flex items-center gap-1.5 text-xs text-muted"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" /> Disponível para ajudar</span></div>
        {onExpand && <Button variant="ghost" aria-label="Abrir assistente em página completa" title="Abrir página completa" className="min-w-10 px-2" onClick={onExpand}><Maximize2 size={18} /></Button>}
        {onClose && <Button variant="ghost" aria-label="Fechar assistente" className="min-w-10 px-2" onClick={onClose}><X size={18} /></Button>}
      </div>
      <div ref={scrollArea} className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[var(--hicash-background)] p-4 sm:p-5" aria-label="Histórico da conversa">
        {!messages.length && (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center py-8 text-center">
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-brand-subtle dark:bg-brand-soft"><img src="/brand/mark-hicash.png" alt="" width="36" height="36" className="h-9 w-9 object-contain" /></span>
            <h2 className="text-lg font-semibold tracking-tight">Olá! Sou o assistente HiCash.</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Posso registrar seus gastos, consultar suas finanças e ajudar você a economizar.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted" aria-label="Exemplos de comandos">
              <span className="rounded-[var(--radius-small)] border border-outline bg-surface-subtle px-2.5 py-1.5">Quanto gastei este mês?</span>
              <span className="rounded-[var(--radius-small)] border border-outline bg-surface-subtle px-2.5 py-1.5">Mostrar meu saldo</span>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mx-auto flex w-full ${full ? "max-w-3xl" : ""} ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && <img src="/brand/mark-hicash.png" alt="" width="28" height="28" loading="lazy" className="mr-2 mt-1 h-7 w-7 shrink-0 object-contain" />}
            <div
              className={`min-w-0 max-w-[90%] rounded-[var(--radius-card)] px-4 py-3 text-sm leading-relaxed sm:max-w-[82%] ${m.role === "user" ? "rounded-br-[3px] bg-brand-soft text-ink dark:bg-brand-soft" : "min-w-[min(310px,70vw)] rounded-bl-[3px] border border-outline bg-surface text-ink shadow-[var(--hicash-shadow)]"}`}
            >
              <p>{m.content}</p>
              {m.role === "assistant" && m.payload && (
                <ChatResult payload={m.payload} onChoose={send} />
              )}
            </div>
          </div>
        ))}
        {busy && <div role="status" aria-live="polite" className="mx-auto flex max-w-3xl items-center gap-2 pl-9 text-xs text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-brand" />Processando sua mensagem…</div>}
        {pending?.kind === "delete" && (
          <div className="flex gap-2">
            <Button onClick={() => send("sim")}>Confirmar exclusão</Button>
            <Button variant="secondary" onClick={() => send("cancelar")}>
              Cancelar
            </Button>
          </div>
        )}
        {pending?.kind === "choose" && (
          <div className="grid gap-2 pl-9">
            {pending.options.map((o: { id: number; label: string }) => (
              <Button
                key={o.id}
                variant="secondary"
                onClick={() => send(String(o.id))}
              >
                {o.label}
              </Button>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mx-auto flex w-full max-w-3xl gap-2 border-t border-outline bg-surface p-3 sm:p-4"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite uma mensagem ou comando financeiro..."
          aria-label="Mensagem"
        />
        <Button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label="Enviar"
          className="min-w-10 px-2.5"
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
