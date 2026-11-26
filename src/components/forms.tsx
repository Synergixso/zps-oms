"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useTransition, type ReactNode } from "react";

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;
type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const FieldErrors = createContext<Record<string, string> | undefined>(undefined);
const Pending = createContext(false);

/** Form bound to a server action; shows server-side validation and authorisation errors. */
export function ActionForm({ action, children, className = "space-y-4", resetOnSuccess = false }: { action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  // Submit via a transition instead of <form action> so React does not reset the
  // user's input when the server returns a validation or authorisation error.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const btn = submitter?.dataset.confirm;
    if (btn && !window.confirm(btn)) return;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => formAction(fd));
  };
  return (
    // method="post": a submit before hydration must never put field values (e.g. passwords) into the URL.
    <form ref={ref} onSubmit={onSubmit} className={className} method="post" noValidate>
      {state?.error && (
        <div role="alert" className="rounded-md border border-err/30 bg-err-bg px-3 py-2 text-sm text-err">
          {state.error}
        </div>
      )}
      {state?.ok && state.message && (
        <div role="status" className="rounded-md border border-ok/30 bg-ok-bg px-3 py-2 text-sm text-ok">
          {state.message}
        </div>
      )}
      <Pending.Provider value={isPending}>
        <FieldErrors.Provider value={state?.fieldErrors}>{children}</FieldErrors.Provider>
      </Pending.Provider>
    </form>
  );
}

export function Submit({ children, variant = "primary", name, value, confirm }: { children: ReactNode; variant?: "primary" | "secondary" | "danger"; name?: string; value?: string; confirm?: string }) {
  const pending = useContext(Pending);
  const cls = {
    primary: "bg-zp-green text-white hover:bg-zp-green-dark border-transparent",
    secondary: "bg-white text-ink border-line-2 hover:bg-slate-50",
    danger: "bg-white text-err border-err/30 hover:bg-err-bg",
  }[variant];
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      data-confirm={confirm}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold shadow-sm disabled:cursor-wait disabled:opacity-60 ${cls}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

const inputCls =
  "mt-1 block w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-slate-400 focus:border-zp-blue focus:outline-none focus:ring-2 focus:ring-zp-blue/20 aria-[invalid=true]:border-err";

function useErr(name: string) {
  return useContext(FieldErrors)?.[name];
}

function Wrap({ label, name, hint, required, children }: { label: string; name: string; hint?: string; required?: boolean; children: ReactNode }) {
  const err = useErr(name);
  return (
    <div>
      <label htmlFor={`f-${name}`} className="block text-[13px] font-semibold text-ink">
        {label}
        {required && <span className="text-err"> *</span>}
      </label>
      {children}
      {hint && !err && <p id={`h-${name}`} className="mt-1 text-xs text-muted">{hint}</p>}
      {err && (
        <p id={`e-${name}`} className="mt-1 text-xs font-medium text-err">
          {err}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, name, hint, required, defaultValue, type = "text", placeholder, maxLength }: { label: string; name: string; hint?: string; required?: boolean; defaultValue?: string | number; type?: string; placeholder?: string; maxLength?: number }) {
  const err = useErr(name);
  return (
    <Wrap label={label} name={name} hint={hint} required={required}>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!err}
        aria-describedby={err ? `e-${name}` : hint ? `h-${name}` : undefined}
        className={inputCls}
      />
    </Wrap>
  );
}

export function TextArea({ label, name, hint, required, defaultValue, rows = 4, maxLength }: { label: string; name: string; hint?: string; required?: boolean; defaultValue?: string; rows?: number; maxLength?: number }) {
  const err = useErr(name);
  return (
    <Wrap label={label} name={name} hint={hint} required={required}>
      <textarea id={`f-${name}`} name={name} rows={rows} required={required} defaultValue={defaultValue} maxLength={maxLength} aria-invalid={!!err} className={inputCls} />
    </Wrap>
  );
}

export function Select({ label, name, options, hint, required, defaultValue, placeholder }: { label: string; name: string; options: Array<{ value: string; label: string }>; hint?: string; required?: boolean; defaultValue?: string; placeholder?: string }) {
  const err = useErr(name);
  return (
    <Wrap label={label} name={name} hint={hint} required={required}>
      <select id={`f-${name}`} name={name} required={required} defaultValue={defaultValue ?? ""} aria-invalid={!!err} className={inputCls}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
