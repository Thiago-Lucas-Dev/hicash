import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, Check, CircleCheck, Eye, EyeOff, LockKeyhole, Mail, MessageCircle, Shield, Utensils, Wallet } from "lucide-react";
import { api, json, resetCsrf, type AuthUser } from "../lib/api";
import { BrandLogo } from "./BrandLogo";
import { Button, Input } from "./ui";
import "./login.css";

const benefits = [
  { title: "Controle financeiro", description: "Suas finanças organizadas.", Icon: Wallet },
  { title: "Análise de gastos", description: "Entenda para onde vai seu dinheiro.", Icon: ChartNoAxesColumnIncreasing },
  { title: "Assistente inteligente", description: "Registre e consulte conversando.", Icon: MessageCircle },
];

function LoginDemoCard() {
  return (
    <section className="login-demo-card" aria-label="Demonstração ilustrativa do assistente HiCash">
      <div className="login-demo-header">
        <img src="/brand/mark-hicash.png" alt="" width="42" height="42" />
        <div><strong>Assistente HiCash</strong><span><i aria-hidden="true" /> Online</span></div>
      </div>
      <div className="login-demo-conversation">
        <div className="login-demo-user">50 lanche <small>10:24 <Check size={11} aria-hidden="true" /></small></div>
        <div className="login-demo-answer">
          <img src="/brand/mark-hicash.png" alt="" width="32" height="32" />
          <span>Despesa registrada com sucesso! <small>10:24 <Check size={11} aria-hidden="true" /></small></span>
        </div>
      </div>
      <div className="login-demo-transaction">
        <div><Wallet size={16} aria-hidden="true" /><span>Movimentação</span><strong className="login-demo-expense">− R$ 50,00</strong></div>
        <div><Utensils size={16} aria-hidden="true" /><span>Categoria</span><strong>Alimentação</strong></div>
        <div><CalendarDays size={16} aria-hidden="true" /><span>Data</span><strong>Hoje, 10:24</strong></div>
        <div><CalendarDays size={16} aria-hidden="true" /><span>Status</span><strong className="login-demo-complete"><CircleCheck size={17} aria-hidden="true" /> Concluído</strong></div>
      </div>
    </section>
  );
}

function LoginBrandPanel() {
  return (
    <section className="login-brand-panel" aria-label="Apresentação do HiCash">
      <BrandLogo theme="light" className="login-brand-logo" />
      <div className="login-brand-intro">
        <p className="login-eyebrow">FINANÇAS PESSOAIS</p>
        <h1>Seu dinheiro,<br /><span>mais organizado.</span></h1>
        <p className="login-brand-subtitle">Organize seus gastos, acompanhe suas finanças<br className="login-desktop-break" /> e simplifique sua rotina com o assistente HiCash.</p>
      </div>
      <div className="login-product-preview">
        <img className="login-mascot" src="/brand/mascot-login.webp" alt="Mascote HiCash com moeda e balão de conversa" width="1254" height="1254" loading="eager" />
        <LoginDemoCard />
      </div>
      <ul className="login-benefits" aria-label="Benefícios do HiCash">
        {benefits.map(({ title, description, Icon }) => (
          <li className="login-benefit" key={title}>
            <span className="login-benefit-icon"><Icon size={33} strokeWidth={2} aria-hidden="true" /></span>
            <span className="login-benefit-copy"><strong>{title}</strong><span>{description}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoginForm({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await api<{ user: AuthUser }>("auth/login", json("POST", { email, password }));
      resetCsrf();
      onLogin(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-auth-panel" aria-label="Acesso à conta">
      <span className="login-auth-dots" aria-hidden="true" />
      <form className="login-form-card" onSubmit={submit} aria-busy={loading}>
        <header className="login-form-header">
          <BrandLogo theme="light" className="login-form-logo" />
          <div className="login-form-heading">
            <p className="login-form-eyebrow">BEM-VINDO DE VOLTA</p>
            <h2>Entre na sua conta</h2>
            <p>Acesse o HiCash e continue cuidando das suas finanças com mais praticidade.</p>
          </div>
        </header>
        <div className="login-form-body">
          <div className="login-fields">
            <label className="login-field" htmlFor="login-email">
              <span>E-mail</span>
              <span className="login-input-wrap"><Mail size={21} aria-hidden="true" /><Input id="login-email" className="login-input" type="email" autoComplete="username" placeholder="seu@email.com" required value={email} onChange={(event) => setEmail(event.target.value)} /></span>
            </label>
            <div className="login-field">
              <label htmlFor="login-password">Senha</label>
              <span className="login-input-wrap login-password-wrap">
                <LockKeyhole size={21} aria-hidden="true" />
                <Input id="login-password" className="login-input" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Digite sua senha" required value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" className="login-password-toggle" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={21} aria-hidden="true" /> : <Eye size={21} aria-hidden="true" />}</button>
              </span>
            </div>
          </div>
          {error && <p role="alert" className="login-error">{error}</p>}
          <Button type="submit" disabled={loading} className="login-submit">{loading ? "Entrando…" : "Entrar na minha conta"}{!loading && <ArrowRight size={22} aria-hidden="true" />}</Button>
          <div className="login-security"><div className="login-security-divider"><span>Acesso seguro</span></div><p><Shield size={18} aria-hidden="true" /> Sessão autenticada e protegida contra CSRF</p></div>
        </div>
      </form>
    </section>
  );
}

export function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  return <main className="login-page"><LoginBrandPanel /><LoginForm onLogin={onLogin} /></main>;
}
