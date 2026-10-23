import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  brl,
  json,
  today,
  type Account,
  type Category,
  type Transaction,
  type Dashboard,
} from "./lib/api";
import { Button, Card, Field, Input, Modal, Select } from "./components/ui";
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
  const [loading, setLoading] = useState(false);

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

  const mutate = async (path: string, method: string, body?: unknown) => {
    setLoading(true);
    try {
      await api(path, body === undefined ? { method } : json(method, body));
      await reload();
      setKind(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
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
    if (window.confirm("Confirma a exclusão?"))
      await mutate(`${route}/${id}`, "DELETE");
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={`${mobileMenu ? "fixed inset-y-0 left-0 z-30" : "hidden"} w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:block dark:border-slate-800 dark:bg-slate-900`}
        >
          <div className="mb-10 flex items-center justify-between px-3">
            <div className="flex items-center gap-2 text-xl font-extrabold">
              <span className="rounded-xl bg-teal-600 p-2 text-white">
                <Wallet size={20} />
              </span>{" "}
              Finanças
            </div>
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenu(false)}
            >
              <X size={18} />
            </Button>
          </div>
          <nav className="space-y-1">
            {menu.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setMobileMenu(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === item.id ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                <item.icon size={19} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-10 rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 dark:bg-slate-800">
            Controle local das suas finanças. Dados salvos no MySQL.
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-28 md:pb-12">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-8 dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="md:hidden"
                onClick={() => setMobileMenu(true)}
              >
                <Menu size={20} />
              </Button>
              <div>
                <h1 className="text-lg font-bold sm:text-xl">
                  {menu.find((x) => x.id === page)?.label}
                </h1>
                <p className="hidden text-xs text-slate-500 sm:block">
                  Seu dinheiro, com clareza.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Mês"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="!w-44"
              />
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
            </div>
          </header>
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200"
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
                    <h2 className="text-2xl font-bold">Movimentações</h2>
                    <p className="text-sm text-slate-500">
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
                  <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
                        <Select
                          value={filters[key as keyof typeof filters]}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              [key as string]: e.target.value,
                            })
                          }
                        >
                          {(opts as string[][]).map(([value, text]) => (
                            <option key={value} value={value}>
                              {text}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table>
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
                            <td className="font-medium">
                              {t.description}
                              <div className="text-xs text-slate-400">
                                {
                                  paymentOptions.find(
                                    (x) => x[0] === t.payment_method,
                                  )?.[1]
                                }
                              </div>
                            </td>
                            <td>{dateLabel(t.reference_date)}</td>
                            <td>{nameOf(categories, t.category_id)}</td>
                            <td>{nameOf(accounts, t.account_id)}</td>
                            <td>
                              <span
                                className={`rounded-full px-2 py-1 text-xs ${t.status === "completed" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"}`}
                              >
                                {t.status === "completed"
                                  ? "Concluído"
                                  : "Pendente"}
                              </span>
                            </td>
                            <td
                              className={
                                t.type === "income"
                                  ? "font-bold text-teal-600"
                                  : "font-bold text-rose-600"
                              }
                            >
                              {t.type === "income" ? "+" : "−"} {brl(t.amount)}
                            </td>
                            <td>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  aria-label="Editar"
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
                                    aria-label="Concluir"
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
                                  aria-label="Excluir"
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
                      <p className="py-8 text-center text-slate-500">
                        Nenhum lançamento neste período.
                      </p>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-3 font-bold">Transferências internas</h3>
                  <div className="space-y-2">
                    {transfers
                      .filter((t) => t.reference_date.startsWith(month))
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between border-b border-slate-100 py-2 text-sm dark:border-slate-800"
                        >
                          <span>
                            {nameOf(accounts, t.from_account_id)} →{" "}
                            {nameOf(accounts, t.to_account_id)}{" "}
                            <span className="text-slate-400">
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
                      <p className="text-sm text-slate-500">
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
                <div className="grid gap-4 lg:grid-cols-2">
                  {(["expense", "income"] as const).map((type) => (
                    <Card key={type}>
                      <h3 className="mb-3 font-bold">
                        {type === "expense" ? "Despesas" : "Receitas"}
                      </h3>
                      {categories
                        .filter((c) => c.type === type)
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between border-b border-slate-100 py-2 text-sm dark:border-slate-800"
                          >
                            <span>
                              {c.name}{" "}
                              {c.essential && (
                                <span className="ml-2 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">
                                  Essencial
                                </span>
                              )}
                            </span>
                            <span>
                              <Button
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
                              <Button
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
                      <div className="flex justify-between">
                        <h3 className="font-bold">{b.category_name}</h3>
                        <span
                          className={
                            b.alert ? "text-rose-600" : "text-teal-600"
                          }
                        >
                          {b.percent}%
                        </span>
                      </div>
                      <div className="my-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${b.alert ? "bg-rose-500" : "bg-teal-500"}`}
                          style={{ width: `${Math.min(b.percent, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500">
                        Usado {brl(b.used)} · Comprometido {brl(b.committed)} de{" "}
                        {brl(b.amount)}
                      </p>
                      {b.alert && (
                        <p className="mt-2 text-sm font-medium text-rose-600">
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
                    <Card>
                      <p className="text-slate-500">
                        Nenhum limite definido para este mês.
                      </p>
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
                    <Card key={r.id}>
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-bold">{r.description}</h3>
                          <p className="text-sm text-slate-500">
                            {r.frequency === "monthly"
                              ? "Mensal"
                              : r.frequency === "weekly"
                                ? "Semanal"
                                : "Anual"}{" "}
                            · início {dateLabel(r.start_date)}
                          </p>
                        </div>
                        <strong>{brl(r.amount)}</strong>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {nameOf(categories, r.category_id)} ·{" "}
                        {nameOf(accounts, r.account_id)}
                      </p>
                      <div className="mt-3 flex gap-1">
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
                    <Card>
                      <p className="text-slate-500">
                        Nenhuma recorrência cadastrada.
                      </p>
                    </Card>
                  )}
                </div>
              </section>
            )}
            {page === "chat" && (
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
            )}
            {page === "settings" && (
              <section className="space-y-5">
                <PageHeading
                  title="Configurações"
                  description="Contas, padrões e associações aprendidas."
                />
                <div className="grid gap-5 lg:grid-cols-2">
                  <Card>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold">Contas financeiras</h3>
                      <Button onClick={() => openForm("account")}>
                        <Plus size={15} /> Conta
                      </Button>
                    </div>
                    {accounts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800"
                      >
                        <span>
                          {a.name}
                          <small className="ml-2 text-slate-400">
                            Inicial {brl(a.opening_balance)}
                          </small>
                        </span>
                        <span>
                          <Button
                            variant="ghost"
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
                            onClick={() => remove("accounts", a.id)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </span>
                      </div>
                    ))}
                    {!accounts.length && (
                      <p className="text-sm text-slate-500">
                        Crie sua primeira conta para começar.
                      </p>
                    )}
                  </Card>
                  <Card>
                    <h3 className="mb-4 font-bold">Preferências</h3>
                    <div className="space-y-3">
                      <Field label="Conta padrão">
                        <Select
                          value={settings.default_account_id || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              default_account_id:
                                Number(e.target.value) || null,
                            })
                          }
                        >
                          <option value="">Primeira conta</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Pagamento padrão">
                        <Select
                          value={settings.default_payment_method || "pix"}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              default_payment_method: e.target.value,
                            })
                          }
                        >
                          {paymentOptions.map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </Select>
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
                        Salvar preferências
                      </Button>
                    </div>
                  </Card>
                  <Card className="lg:col-span-2">
                    <h3 className="mb-3 font-bold">Associações aprendidas</h3>
                    <p className="mb-3 text-sm text-slate-500">
                      Palavras associadas a categorias após confirmação ou
                      correção.
                    </p>
                    {aliases.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between border-b border-slate-100 py-2 text-sm dark:border-slate-800"
                      >
                        <span>
                          {a.keyword} → {nameOf(categories, a.category_id)}
                        </span>
                        <Button
                          variant="ghost"
                          onClick={() => remove("categories/aliases", a.id)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    ))}
                    {!aliases.length && (
                      <p className="text-sm text-slate-500">
                        Nenhuma associação aprendida.
                      </p>
                    )}
                  </Card>
                </div>
                <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  Compras no cartão de crédito entram nas despesas e nos
                  orçamentos, mas não reduzem o saldo bancário. O controle de
                  faturas não está disponível nesta versão.
                </Card>
              </section>
            )}
          </div>
        </main>
      </div>
      {page !== "chat" && (
        <>
          <Button
            className="fixed bottom-5 right-5 z-30 rounded-full px-5 py-4 shadow-xl"
            onClick={() => setFloatingChat(true)}
          >
            <MessageCircle size={20} /> Assistente
          </Button>
          {floatingChat && (
            <div
              className="fixed inset-0 z-40 bg-slate-950/40"
              onClick={() => setFloatingChat(false)}
            >
              <div
                className="absolute bottom-0 right-0 h-[min(85vh,680px)] w-full max-w-[420px] overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:bottom-5 sm:right-5 sm:rounded-2xl dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between border-b p-3 dark:border-slate-800">
                  <strong>Assistente financeiro</strong>
                  <Button
                    variant="ghost"
                    onClick={() => setFloatingChat(false)}
                  >
                    <X size={18} />
                  </Button>
                </div>
                <ChatPanel
                  messages={messages}
                  chatState={chatState}
                  accounts={accounts}
                  categories={categories}
                  aliases={aliases}
                  settings={settings}
                  onSent={reload}
                />
              </div>
            </div>
          )}
        </>
      )}
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
                  <Select
                    value={future ? "future" : "rule"}
                    onChange={(e) => setFuture(e.target.value === "future")}
                  >
                    <option value="rule">Próximas gerações da regra</option>
                    <option value="future">Todas as ocorrências futuras</option>
                  </Select>
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
              <p role="alert" className="text-sm text-rose-600 sm:col-span-2">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 sm:col-span-2">
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
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
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
      <Select
        required
        value={value(key)}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="">Selecione</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
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
          <Select
            value={form.essential ? "yes" : "no"}
            onChange={(e) => set("essential", e.target.value === "yes")}
          >
            <option value="no">Não essencial</option>
            <option value="yes">Essencial</option>
          </Select>
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
            <Select
              value={form.active ? "yes" : "no"}
              onChange={(e) => set("active", e.target.value === "yes")}
            >
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </Select>
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
      color: "text-slate-900 dark:text-white",
    },
    {
      label: "Saldo previsto",
      value: projected,
      Icon: TrendingUp,
      color: "text-teal-600",
    },
    {
      label: "Receitas",
      value: data?.totals.income || 0,
      Icon: TrendingUp,
      color: "text-teal-600",
    },
    {
      label: "Despesas",
      value: data?.totals.expense || 0,
      Icon: TrendingDown,
      color: "text-rose-600",
    },
  ];
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Bem-vindo às suas finanças</h2>
          <p className="text-sm text-slate-500">
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
        {metrics.map(({ label, value, Icon, color }) => (
          <Card key={label}>
            <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
              {label}
              <Icon size={18} />
            </div>
            <div className={`text-2xl font-extrabold ${color}`}>
              {brl(value)}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-bold">Despesas por categoria</h3>
          <div className="h-64">
            {categoryChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChart}
                  layout="vertical"
                  margin={{ left: 15, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(n) => `R$ ${n}`} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Tooltip formatter={(v) => brl(Number(v))} />
                  <Bar dataKey="value" fill="#0d9488" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 font-bold">Evolução mensal</h3>
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => brl(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#0d9488"
                    fill="#ccfbf1"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#e11d48"
                    fill="#ffe4e6"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Mês anterior: despesas {brl(data?.previous.expense || 0)}
          </p>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-bold">Saldos por conta</h3>
          {data?.balances.map((a) => (
            <div
              key={a.id}
              className="flex justify-between border-b border-slate-100 py-3 text-sm dark:border-slate-800"
            >
              <span>{a.name}</span>
              <span>
                <strong>{brl(a.effective)}</strong>
                <small className="ml-2 text-slate-500">
                  Previsto {brl(a.projected)}
                </small>
              </span>
            </div>
          ))}
          {!data?.balances.length && (
            <p className="text-sm text-slate-500">
              Cadastre uma conta para começar.
            </p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Limites em acompanhamento</h3>
          {data?.budgets.map((b) => (
            <div key={b.id} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <span>{b.category_name}</span>
                <span>{b.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${b.alert ? "bg-rose-500" : "bg-teal-500"}`}
                  style={{ width: `${Math.min(100, b.percent)}%` }}
                />
              </div>
            </div>
          ))}
          {!data?.budgets.length && (
            <p className="text-sm text-slate-500">Nenhum limite neste mês.</p>
          )}
        </Card>
      </div>
      <Card>
        <h3 className="mb-3 font-bold">Movimentações recentes</h3>
        <div className="space-y-2">
          {data?.recent.map((t) => (
            <div
              key={t.id}
              className="flex justify-between border-b border-slate-100 py-2 text-sm dark:border-slate-800"
            >
              <span>
                {t.description}
                <small className="ml-2 text-slate-400">
                  {nameOf(categories, t.category_id)} ·{" "}
                  {dateLabel(t.reference_date)}
                </small>
              </span>
              <strong
                className={
                  t.type === "income" ? "text-teal-600" : "text-rose-600"
                }
              >
                {t.type === "income" ? "+" : "−"} {brl(t.amount)}
              </strong>
            </div>
          ))}
          {!transactions.length && (
            <p className="text-sm text-slate-500">
              Nenhuma movimentação ainda.
            </p>
          )}
        </div>
      </Card>
      <p className="text-xs text-slate-500">
        Despesas no cartão entram nos gastos, mas não reduzem o saldo bancário
        nesta versão.
      </p>
    </section>
  );
}
function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
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
}: {
  messages: ChatMessage[];
  chatState: ChatState | null;
  accounts: Account[];
  categories: Category[];
  aliases: Alias[];
  settings: Settings;
  onSent: () => Promise<void>;
  full?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = chatState?.pending ? JSON.parse(chatState.pending) : null;
  const contextHistory = chatState?.context
    ? JSON.parse(chatState.context)
    : [];
  const context = Array.isArray(contextHistory)
    ? contextHistory.at(-1)
    : contextHistory;
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
      className={`flex flex-col ${full ? "h-[calc(100vh-240px)] min-h-[500px] rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" : "h-[calc(100%-52px)]"}`}
    >
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {!messages.length && (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="mx-auto mb-4 w-fit rounded-2xl bg-teal-50 p-4 text-teal-700">
              <MessageCircle size={28} />
            </div>
            <h2 className="text-xl font-bold">Como posso ajudar?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Experimente “50 lanche”, “quanto gastei este mês?” ou “como posso
              economizar?”.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-teal-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
            >
              <p>{m.content}</p>
              {m.role === "assistant" && m.payload && (
                <ChatExtras payload={m.payload} onChoose={send} />
              )}
            </div>
          </div>
        ))}
        {pending?.kind === "delete" && (
          <div className="flex gap-2">
            <Button onClick={() => send("sim")}>Confirmar exclusão</Button>
            <Button variant="secondary" onClick={() => send("cancelar")}>
              Cancelar
            </Button>
          </div>
        )}
        {pending?.kind === "choose" && (
          <div className="grid gap-2">
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
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite um comando financeiro..."
          aria-label="Mensagem"
        />
        <Button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label="Enviar"
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
function ChatExtras({
  payload,
  onChoose,
}: {
  payload: string;
  onChoose: (m: string) => void;
}) {
  try {
    const result = JSON.parse(payload);
    return (
      <>
        {result.cards?.totals && (
          <div className="mt-3 border-t border-slate-300 pt-2 text-xs">
            Receitas {brl(result.cards.totals.income)} · Despesas{" "}
            {brl(result.cards.totals.expense)}
          </div>
        )}
        {result.options?.map((o: { id: number; label: string }) => (
          <button
            key={o.id}
            className="mt-2 block text-left text-xs font-semibold text-teal-600 underline"
            onClick={() => onChoose(String(o.id))}
          >
            {o.label}
          </button>
        ))}
      </>
    );
  } catch {
    return null;
  }
}
