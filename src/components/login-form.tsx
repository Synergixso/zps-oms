"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import type { ActionState } from "./forms";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const field =
  "block w-full rounded-lg border border-line-2 bg-white py-3 pl-11 pr-11 text-[15px] text-ink shadow-sm placeholder:text-slate-500 focus:border-zp-blue focus:outline-none focus:ring-2 focus:ring-zp-blue/20";

/** Official ZPS-OMS sign-in form (username + password; scrypt, lockout and throttling on the server). */
export function LoginForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [, start] = useTransition();
  const [show, setShow] = useState(false);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => formAction(fd));
      }}
      className="space-y-4"
    >
      {state?.error && (
        <div role="alert" className="rounded-lg border border-err/30 bg-err-bg px-3 py-2 text-sm text-err">
          {state.error}
        </div>
      )}
      <div className="relative">
        <label htmlFor="f-username" className="sr-only">
          Username
        </label>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden>
          <Icon name="user" />
        </span>
        <input id="f-username" name="username" autoComplete="username" required maxLength={80} placeholder="Username" className={field} />
      </div>
      <div className="relative">
        <label htmlFor="f-password" className="sr-only">
          Password
        </label>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden>
          <Icon name="lock" />
        </span>
        <input id="f-password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required maxLength={128} placeholder="Password" className={field} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-2 hover:bg-slate-100"
        >
          <Icon name="eye" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <label className="inline-flex cursor-pointer items-center gap-2 text-ink">
          <input type="checkbox" name="remember" value="1" className="h-4 w-4 rounded border-line-2 accent-zp-green" />
          Remember me
        </label>
        <Link href="/contact" className="font-medium text-zp-blue hover:underline">
          Forgot password?
        </Link>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-gradient-to-b from-[#1f8a3a] to-[#0f6b27] px-4 py-3 text-[16px] font-bold text-white shadow-md hover:from-[#1a7d34] hover:to-[#0c5a21] disabled:cursor-wait disabled:opacity-70"
      >
        <Icon name="arrow" />
        {pending ? "Signing in…" : "Sign In to ZPS-OMS"}
      </button>
    </form>
  );
}

/** Fills the username field from the synthetic account list (local review only). */
export function UseAccount({ username }: { username: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.getElementById("f-username") as HTMLInputElement | null;
        if (el) {
          el.value = username;
          el.scrollIntoView({ block: "center" });
          (document.getElementById("f-password") as HTMLInputElement | null)?.focus();
        }
      }}
      className="rounded border border-line-2 px-2 py-0.5 text-[11px] font-semibold text-ink hover:border-zp-green hover:bg-emerald-50"
    >
      Use
    </button>
  );
}
