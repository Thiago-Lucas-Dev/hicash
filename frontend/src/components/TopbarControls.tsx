import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, LogOut, Settings } from "lucide-react";
import type { AuthUser } from "../lib/api";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const contentStyle = "z-50 rounded-[9px] border border-outline bg-surface p-2 text-ink shadow-[var(--hicash-shadow-popover)]";

export function PeriodPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const month = Number(value.slice(5, 7));
  return <DropdownMenu.Root onOpenChange={(open) => { if (open) setYear(Number(value.slice(0, 4))); }}>
    <DropdownMenu.Trigger aria-label="Selecionar período" className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-outline bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-brand/50 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus">
      <CalendarDays size={16} className="text-brand" aria-hidden="true" /> {months[month - 1]} {value.slice(0, 4)} <ChevronDown size={15} className="text-muted" aria-hidden="true" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={7} className={`${contentStyle} w-64`}>
      <div className="mb-2 flex items-center justify-between border-b border-outline pb-2">
        <button type="button" aria-label="Ano anterior" onClick={() => setYear(year - 1)} className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] hover:bg-brand-subtle focus-visible:outline-2 focus-visible:outline-brand-focus"><ChevronLeft size={17} /></button>
        <span className="font-semibold tabular-nums">{year}</span>
        <button type="button" aria-label="Próximo ano" onClick={() => setYear(year + 1)} className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] hover:bg-brand-subtle focus-visible:outline-2 focus-visible:outline-brand-focus"><ChevronRight size={17} /></button>
      </div>
      <div className="grid grid-cols-3 gap-1">{months.map((label, index) => <DropdownMenu.Item key={label} onSelect={() => onChange(`${year}-${String(index + 1).padStart(2, "0")}`)} className={`flex min-h-10 cursor-pointer items-center justify-center rounded-[var(--radius-control)] text-sm outline-none focus:bg-brand-subtle dark:focus:bg-brand-soft ${year === Number(value.slice(0, 4)) && index + 1 === month ? "bg-brand-subtle font-semibold text-action dark:bg-brand-soft dark:text-finance-positive" : "hover:bg-surface-subtle"}`}>{label}</DropdownMenu.Item>)}</div>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>;
}

export function UserProfile({ user, onSettings, onLogout }: { user: AuthUser; onSettings: () => void; onLogout: () => void }) {
  const name = user.name?.trim() || user.email?.split("@")[0] || "Usuário";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  const avatar = <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-action dark:text-finance-positive">{initials}</span>;
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger aria-label={`Perfil de ${name}`} className="flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-transparent px-1.5 text-left transition-colors hover:border-outline hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-brand-focus sm:px-2">
      {avatar}<span className="hidden min-w-0 max-w-36 sm:grid"><strong className="truncate text-sm leading-5 text-ink">{name}</strong>{user.email && <small className="truncate text-xs leading-4 text-muted">{user.email}</small>}</span><ChevronDown size={15} className="text-muted" aria-hidden="true" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={7} className={`${contentStyle} w-64`}>
      <div className="flex items-center gap-3 border-b border-outline px-2 py-2.5">{avatar}<div className="min-w-0"><strong className="block truncate text-sm">{name}</strong>{user.email && <small className="block truncate text-xs text-muted">{user.email}</small>}</div></div>
      <DropdownMenu.Item onSelect={onSettings} className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 text-sm outline-none focus:bg-brand-subtle dark:focus:bg-brand-soft"><Settings size={16} /> Configurações</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={onLogout} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 text-sm outline-none focus:bg-danger-soft focus:text-danger-ink"><LogOut size={16} /> Sair</DropdownMenu.Item>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>;
}
