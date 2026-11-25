"use client";

/** Current calendar year, evaluated in the browser so pre-rendered pages never show a stale year. */
export function CurrentYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}
