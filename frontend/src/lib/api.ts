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

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(
  /\/$/,
  "",
);
const csrfUrl = import.meta.env.VITE_CSRF_URL || "/api/csrf-cookie";

const xsrfToken = () => {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("XSRF-TOKEN="));

  return cookie ? decodeURIComponent(cookie.slice("XSRF-TOKEN=".length)) : null;
};

export async function csrf(): Promise<void> {
  const response = await fetch(csrfUrl, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new ApiError(
      "Não foi possível iniciar uma sessão segura.",
      response.status,
    );
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retryCsrf = true,
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const token = xsrfToken();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && !["GET", "HEAD", "OPTIONS"].includes(method)
        ? { "X-XSRF-TOKEN": token }
        : {}),
      ...options.headers,
    },
  });
  if (response.status === 419 && retryCsrf) {
    await csrf();
    return api<T>(path, options, false);
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event("hicash:unauthorized"));
    }
    throw new ApiError(
      data.message ||
        Object.values(data.errors || {})
          .flat()
          .join(" ") ||
        "Falha ao comunicar com a API",
      response.status,
    );
  }
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
