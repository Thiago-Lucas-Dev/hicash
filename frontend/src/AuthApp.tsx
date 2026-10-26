import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LockKeyhole, Wallet } from "lucide-react";
import App from "./App";
import { ApiError, api, csrf, json, type AuthUser } from "./lib/api";
import { Button, Card, Field, Input } from "./components/ui";

export default function AuthApp() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener("hicash:unauthorized", handleUnauthorized);

    api<{ user: AuthUser }>("auth/user")
      .then((response) => setUser(response.user))
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          return;
        }
        setUser(null);
      });

    return () =>
      window.removeEventListener("hicash:unauthorized", handleUnauthorized);
  }, []);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Carregando o HiCash...
      </div>
    );
  }

  const logout = async () => {
    await api("auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onAuthenticated={setUser} />
          )
        }
      />
      <Route
        path="/*"
        element={
          user ? (
            <App user={user} onLogout={logout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function LoginPage({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await csrf();
      const response = await api<{ user: AuthUser }>(
        "auth/login",
        json("POST", { email, password }),
      );
      onAuthenticated(response.user);
      const destination = (location.state as { from?: string } | null)?.from;
      navigate(destination || "/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível entrar.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-teal-600 p-3 text-white">
            <Wallet size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              HiCash
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Entre para acessar suas finanças.
            </p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="E-mail">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          {error && (
            <p
              role="alert"
              className="text-sm text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="mt-2 w-full">
            <LockKeyhole size={17} /> {busy ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
