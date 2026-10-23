import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...classes: (string | undefined | false)[]) =>
  twMerge(clsx(classes));
const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
  {
    variants: {
      variant: {
        primary: "bg-teal-600 text-white hover:bg-teal-700",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-white",
        ghost: "hover:bg-slate-100 dark:hover:bg-slate-800",
        danger: "bg-rose-600 text-white hover:bg-rose-700",
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
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900",
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
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950",
        props.className,
      )}
    />
  );
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950",
        props.className,
      )}
    />
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-xl font-bold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" aria-label="Fechar">
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
