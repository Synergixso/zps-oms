"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { submitContactAction } from "@/server/actions/contact";
import { Icon } from "./icons";
import type { IconName } from "@/lib/nav";

type State = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

const SUBJECTS: Array<[string, string]> = [
  ["ENQUIRY", "General enquiry"],
  ["SUPPORT", "Technical support"],
  ["ACCESS", "System access / user accounts"],
  ["FEEDBACK", "Feedback / suggestions"],
];
const MAX = 1000;

function Field({ id, label, required, icon, error, children }: { id: string; label: string; required?: boolean; icon: IconName; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[15px] font-bold text-[#0d1b3e]">
        {label}
        {required && <span className="text-err"> *</span>}
      </label>
      <div className="relative mt-1.5">
        <Icon name={icon} className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-[#52667b]" />
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[13px] font-medium text-err">
          {error}
        </p>
      )}
    </div>
  );
}

const input =
  "block w-full rounded-lg border border-[#c9d3e1] bg-white py-2.5 pl-11 pr-3 text-[15px] text-ink shadow-sm placeholder:text-[#7a8aa0] focus:border-zp-blue focus:outline-none focus:ring-2 focus:ring-zp-blue/20 aria-[invalid=true]:border-err";

export function ContactForm({ defaultSubject }: { defaultSubject?: string }) {
  const [state, action, pending] = useActionState<State, FormData>(submitContactAction, null);
  const [, startTransition] = useTransition();
  const [count, setCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const subjectRef = useRef<HTMLSelectElement>(null);
  const fe = state?.fieldErrors ?? {};

  // A new successful result resets the counter (state adjusted during render) and the form fields (DOM, in an effect).
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state?.ok) setCount(0);
  }
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  // Quick links below the form change the subject without a page reload.
  useEffect(() => {
    if (defaultSubject && subjectRef.current) subjectRef.current.value = defaultSubject;
  }, [defaultSubject]);

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
      aria-describedby="contact-intro"
    >
      {state?.ok && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-ok/30 bg-ok-bg px-4 py-3 text-[14.5px] text-[#14532d]">
          <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
          <span>
            Thank you — your message has been received. Your reference is <strong>{state.message}</strong>. Please quote it in any follow-up.
          </span>
        </div>
      )}
      {state?.error && (
        <div role="alert" className="rounded-lg border border-err/30 bg-err-bg px-4 py-3 text-[14.5px] text-err">
          {state.error}
        </div>
      )}

      <Field id="c-name" label="Full Name" required icon="user" error={fe.fullName}>
        <input id="c-name" name="fullName" autoComplete="name" maxLength={80} placeholder="Enter your full name" aria-invalid={!!fe.fullName} className={input} />
      </Field>
      <Field id="c-email" label="Email Address" required icon="mail" error={fe.email}>
        <input id="c-email" name="email" type="email" autoComplete="email" maxLength={120} placeholder="Enter your email address" aria-invalid={!!fe.email} className={input} />
      </Field>
      <Field id="c-phone" label="Phone Number" icon="phone" error={fe.phone}>
        <input id="c-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} placeholder="e.g. +260 97 123 4567" aria-invalid={!!fe.phone} className={input} />
      </Field>
      <Field id="c-subject" label="Subject" required icon="list" error={fe.subject}>
        <select id="c-subject" name="subject" ref={subjectRef} defaultValue={defaultSubject ?? ""} aria-invalid={!!fe.subject} className={`${input} appearance-none pr-10`}>
          <option value="">Select a subject</option>
          {SUBJECTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <Icon name="chevron" className="pointer-events-none absolute right-3 top-3 h-5 w-5 rotate-90 text-[#0d1b3e]" />
      </Field>
      <Field id="c-message" label="Message" required icon="chat" error={fe.message}>
        <textarea
          id="c-message"
          name="message"
          rows={5}
          maxLength={MAX}
          placeholder="Type your message here..."
          aria-invalid={!!fe.message}
          aria-describedby="c-count"
          onChange={(e) => setCount(e.target.value.length)}
          className={`${input} resize-y`}
        />
      </Field>
      <p id="c-count" className="-mt-2 text-right text-[13px] text-[#52667b]" aria-live="polite">
        {count} / {MAX.toLocaleString()}
      </p>

      {/* Honeypot: hidden from people and assistive technology. */}
      <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-b from-[#1fa04f] to-[#147a36] px-6 py-3.5 text-[18px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(22,130,59,0.8)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
      >
        <Icon name="send" className="h-6 w-6" />
        {pending ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
