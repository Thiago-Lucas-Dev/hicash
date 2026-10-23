export type Account = { id: number; name: string; opening_balance: string };
export type Category = {
  id: number;
  name: string;
  type: "income" | "expense";
  essential: boolean;
};
export type Transaction = {
  id: number;
  account_id: number;
  category_id: number;
  type: "income" | "expense";
  description: string;
  amount: string;
  reference_date: string;
  status: "pending" | "completed";
  payment_method: string;
  note?: string;
  origin: string;
};
export type Budget = {
  id: number;
  category_id: number;
  category_name: string;
  amount: string;
  alert_percent: number;
  used: string;
  committed: string;
  percent: number;
  alert: boolean;
};
export type Dashboard = {
  totals: Record<string, string>;
  balances: {
    id: number;
    name: string;
    effective: string;
    projected: string;
  }[];
  balance_totals: { effective: string; projected: string };
  categories: { name: string; completed: string; pending: string }[];
  months: { month: string; income: string; expense: string }[];
  trend: { month: string; income: string; expense: string }[];
  recent: Transaction[];
  budgets: Budget[];
  previous: Record<string, string>;
};

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.message ||
        Object.values(data.errors || {})
          .flat()
          .join(" ") ||
        "Falha ao comunicar com a API",
    );
  return data as T;
}
export const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});
export const brl = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0),
  );
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
