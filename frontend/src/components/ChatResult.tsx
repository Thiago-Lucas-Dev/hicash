import { ArrowLeftRight, CalendarDays, CheckCircle2, CreditCard, Tags, Wallet } from "lucide-react";
import { brl } from "../lib/api";

type TransactionSummary = { id: number; type: "income" | "expense"; description: string; amount: string; reference_date: string; status: "pending" | "completed"; payment_method: string; account_name: string; category_name: string };
type Presentation = { kind: "transactions_created"; items: TransactionSummary[] } | { kind: "transaction_updated" | "transaction_status_updated" | "transaction_deleted"; item: TransactionSummary } | { kind: "budget_updated"; item: { category_name: string; amount: string; year: number; month: number } };
type Result = { cards?: unknown; options?: { id: number; label: string }[]; presentation?: Presentation };
const payments: Record<string, string> = { pix: "Pix", debit: "Débito", cash: "Dinheiro", bank_transfer: "Transferência bancária", credit_card: "Cartão de crédito" };
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");

function TransactionCard({ item, deleted }: { item: TransactionSummary; deleted?: boolean }) {
  const rows = [
    { label: "Movimentação", value: `${item.type === "income" ? "+" : "−"} ${brl(item.amount)}`, icon: ArrowLeftRight, prominent: true },
    { label: "Descrição", value: item.description, icon: Wallet },
    { label: "Categoria", value: item.category_name, icon: Tags },
    { label: "Conta", value: item.account_name, icon: Wallet },
    { label: "Data", value: date(item.reference_date), icon: CalendarDays },
    { label: "Status", value: deleted ? "Excluído" : item.status === "completed" ? "Concluído" : "Pendente", icon: CheckCircle2, status: true },
    { label: "Pagamento", value: payments[item.payment_method] || item.payment_method, icon: CreditCard },
  ];
  return <div className="mt-3 w-full rounded-[var(--radius-card)] border border-outline bg-surface p-3 shadow-[var(--hicash-shadow)] sm:p-4" aria-label={`Resumo da movimentação ${item.description}`}>
    {rows.map(({ label, value, icon: Icon, prominent, status }) => <div key={label} className="grid grid-cols-[17px_minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 border-b border-outline/70 py-2 text-xs last:border-0 first:pt-0 last:pb-0 sm:grid-cols-[18px_minmax(0,1fr)_minmax(0,1.2fr)]">
      <Icon size={15} aria-hidden="true" className="text-brand" /><span className="text-muted">{label}</span><strong className={`break-words text-right font-semibold ${prominent ? `money text-sm ${item.type === "income" ? "text-finance-positive" : "text-finance-negative"}` : status ? `justify-self-end rounded-full px-2 py-0.5 ${deleted ? "bg-danger-soft text-danger-ink" : item.status === "completed" ? "bg-brand-subtle text-finance-positive dark:bg-brand-soft" : "bg-warning-soft text-warning"}` : "text-ink"}`}>{value}</strong>
    </div>)}
  </div>;
}

function isTransaction(item: unknown): item is TransactionSummary {
  if (!item || typeof item !== "object") return false;
  const value = item as Record<string, unknown>;
  return typeof value.id === "number" && typeof value.amount === "string" && typeof value.account_name === "string" && typeof value.category_name === "string";
}

export function ChatResult({ payload, onChoose }: { payload: string; onChoose: (message: string) => void }) {
  let result: Result;
  try { result = JSON.parse(payload) as Result; } catch { return null; }
  const presentation = result.presentation;
  const cards = result.cards;
  const totals = cards && !Array.isArray(cards) && typeof cards === "object" ? (cards as Record<string, unknown>).totals as Record<string, string> | undefined : undefined;
  const balances = Array.isArray(cards) && cards.every((card) => card && typeof card === "object" && "effective" in card) ? cards as { id: number; name: string; effective: string; projected: string }[] : null;
  const categoryCards = cards && !Array.isArray(cards) && typeof cards === "object" && "categories" in cards ? (cards as { categories: unknown }).categories : cards;
  const categories = Array.isArray(categoryCards) && categoryCards.every((card) => card && typeof card === "object" && "completed" in card && "name" in card) ? categoryCards as { name: string; completed: string; pending: string }[] : null;
  const comparison = cards && !Array.isArray(cards) && typeof cards === "object" && "current" in cards ? cards as { current: string; previous: string } : null;
  return <div className="mt-2 space-y-2">
    {presentation?.kind === "transactions_created" && presentation.items.filter(isTransaction).map((item) => <TransactionCard key={item.id} item={item} />)}
    {presentation && presentation.kind !== "transactions_created" && presentation.kind !== "budget_updated" && isTransaction(presentation.item) && <TransactionCard item={presentation.item} deleted={presentation.kind === "transaction_deleted"} />}
    {presentation?.kind === "budget_updated" && <div className="rounded-[var(--radius-card)] border border-outline bg-surface p-3 text-xs"><span className="text-muted">Limite de {presentation.item.category_name} · {String(presentation.item.month).padStart(2, "0")}/{presentation.item.year}</span><strong className="money mt-1 block text-base text-finance-positive">{brl(presentation.item.amount)}</strong></div>}
    {totals && <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-card)] border border-outline bg-surface p-2 text-xs"><div className="rounded-[var(--radius-control)] bg-brand-subtle p-2 text-action dark:bg-brand-soft dark:text-finance-positive">Receitas<strong className="money mt-1 block text-sm">{brl(totals.income)}</strong></div><div className="rounded-[var(--radius-control)] bg-danger-soft p-2 text-finance-negative">Despesas<strong className="money mt-1 block text-sm">{brl(totals.expense)}</strong></div></div>}
    {balances && balances.length > 0 && <div className="rounded-[var(--radius-card)] border border-outline bg-surface p-3 text-xs">{balances.map((balance) => <div key={balance.id} className="flex justify-between gap-3 border-b border-outline py-2 last:border-0"><span>{balance.name}</span><strong className="money">{brl(balance.effective)}</strong></div>)}</div>}
    {comparison && <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-card)] border border-outline bg-surface p-3 text-xs"><span>Período anterior<strong className="money mt-1 block text-sm">{brl(comparison.previous)}</strong></span><span>Período atual<strong className="money mt-1 block text-sm">{brl(comparison.current)}</strong></span></div>}
    {categories && categories.length > 0 && <div className="rounded-[var(--radius-card)] border border-outline bg-surface p-3 text-xs">{categories.slice(0, 5).map((category) => <div key={category.name} className="flex justify-between gap-3 border-b border-outline py-2 last:border-0"><span>{category.name}</span><strong className="money text-finance-negative">{brl(category.completed)}</strong></div>)}</div>}
    {result.options?.map((option) => <button type="button" key={option.id} className="block min-h-9 rounded-[var(--radius-control)] px-2 text-left text-xs font-semibold text-action underline underline-offset-2 hover:bg-brand-subtle focus-visible:outline-2 focus-visible:outline-brand-focus" onClick={() => onChoose(String(option.id))}>{option.label}</button>)}
  </div>;
}
