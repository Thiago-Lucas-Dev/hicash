import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  ReactElement,
} from "react";
import { cloneElement, useId } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadixSelect from "@radix-ui/react-select";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Check, ChevronDown, X } from "lucide-react";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...classes: (string | undefined | false)[]) =>
  twMerge(clsx(classes));
const buttonStyles = cva(
  "inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] px-3.5 py-2 text-sm font-semibold leading-5 transition-colors duration-150 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus",
  {
    variants: {
      variant: {
        primary: "bg-action text-action-on hover:bg-action-hover active:bg-[var(--hicash-green-pressed)]",
        secondary:
          "border border-outline bg-surface text-ink hover:bg-surface-subtle hover:border-brand/40",
        ghost: "text-muted hover:bg-surface-subtle hover:text-ink",
        danger: "bg-danger text-white hover:bg-danger-hover active:bg-danger-active",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={cn(buttonStyles({ variant }), className)} {...props} />
  );
}
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-outline bg-surface p-5 shadow-[var(--hicash-shadow)] sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-10 w-full rounded-[var(--radius-control)] border border-outline bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 hover:border-muted/50 focus:border-brand-focus focus-visible:ring-2 focus-visible:ring-brand-focus/20",
        props.className,
      )}
    />
  );
}
export type SelectOption = { value: string; label: string; disabled?: boolean };
export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecione",
  disabled,
  required,
  name,
  className,
  ariaLabel,
  id,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  ariaLabel?: string;
  id?: string;
}) {
  // Radix uses an empty value for its placeholder, so a sentinel preserves
  // existing filters and optional settings whose domain value is empty.
  const emptyValue = "__hicash_empty__";
  const selected = value;
  return (
    <RadixSelect.Root value={selected} onValueChange={(next) => onValueChange(next === emptyValue ? "" : next)} disabled={disabled} required={required} name={name}>
      <RadixSelect.Trigger id={id} aria-label={ariaLabel} className={cn("flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border border-outline bg-surface px-3 py-2 text-left text-sm text-ink outline-none transition-colors hover:border-brand/45 focus-visible:border-brand-focus focus-visible:ring-2 focus-visible:ring-brand-focus/25 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted", className)}>
        <RadixSelect.Value placeholder={options.find((option) => option.value === "")?.label || placeholder} />
        <RadixSelect.Icon><ChevronDown size={16} aria-hidden="true" className="text-muted" /></RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content position="popper" sideOffset={5} className="z-[70] max-h-[min(320px,70vh)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[9px] border border-outline bg-surface p-1 text-ink shadow-[var(--hicash-shadow-popover)]">
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item key={option.value} value={option.value === "" ? emptyValue : option.value} disabled={option.disabled} className="relative flex min-h-10 cursor-pointer select-none items-center rounded-[var(--radius-control)] py-2 pl-3 pr-9 text-sm outline-none data-[highlighted]:bg-brand-subtle data-[highlighted]:text-ink data-[state=checked]:font-semibold data-[disabled]:opacity-50 dark:data-[highlighted]:bg-brand-soft">
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-3 text-brand"><Check size={16} aria-hidden="true" /></RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5 text-sm font-medium text-ink">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children as ReactElement<{ id?: string }>, { id })}
    </div>
  );
}
export function ConfirmDialog({ open, onOpenChange, onConfirm, loading }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void; loading?: boolean }) {
  return <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/50" />
      <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(92vw,430px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-modal)] border border-outline bg-surface p-6 text-ink shadow-[var(--hicash-shadow-popover)]">
        <AlertDialog.Title className="text-lg font-semibold">Confirmar exclusão</AlertDialog.Title>
        <AlertDialog.Description className="mt-2 text-sm text-muted">Esta ação removerá o item selecionado.</AlertDialog.Description>
        <div className="mt-6 flex justify-end gap-2"><AlertDialog.Cancel asChild><Button variant="secondary" disabled={loading}>Cancelar</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button variant="danger" disabled={loading} onClick={onConfirm}>{loading ? "Excluindo…" : "Excluir"}</Button></AlertDialog.Action></div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[var(--radius-modal)] border border-outline bg-surface p-5 text-ink shadow-2xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-outline pb-4">
            <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" aria-label="Fechar" className="min-h-8 px-2">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
