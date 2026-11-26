import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db/connection";
import { globalSearch } from "@/server/domain/search";
import { Card, Notice, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requireActor();
  const { q = "" } = await searchParams;
  const groups = await globalSearch(getDb(), actor, q);
  const total = groups.reduce((n, g) => n + g.hits.length, 0);
  return (
    <>
      <PageHeader eyebrow="Search" title={q ? `Results for “${q}”` : "Search ZPS-OMS"} description="Searches only the records your role and organisational scope allow. Use a name, service number or reference (PER-, MPR-, ASG-, TRF-)." />
      <form action="/app/search" method="get" role="search" className="mb-5 flex max-w-2xl gap-2">
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" name="q" type="search" defaultValue={q} minLength={2} maxLength={60} autoFocus placeholder="Name, service number, reference or area" className="h-11 min-w-0 flex-1 rounded-full border border-line-2 bg-white px-4 text-sm focus:border-zp-blue focus:outline-none focus:ring-2 focus:ring-zp-blue/20" />
        <button className="inline-flex shrink-0 items-center gap-2 rounded-full bg-zp-green px-4 text-sm sm:px-5 font-semibold text-white hover:bg-zp-green-dark"><Icon name="search" />Search</button>
      </form>
      {q.trim().length >= 2 && total === 0 && <Notice tone="info">No matching records within your authorised scope.</Notice>}
      {q.trim().length > 0 && q.trim().length < 2 && <Notice tone="warn">Enter at least two characters.</Notice>}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.key} title={`${g.label} (${g.hits.length})`} bodyClass="p-0">
            <ul className="divide-y divide-line">
              {g.hits.map((h) => (
                <li key={h.href}>
                  <Link href={h.href} className="block px-4 py-2.5 hover:bg-slate-50">
                    <span className="block text-sm font-semibold text-zp-blue">{h.title}</span>
                    <span className="block text-xs text-muted">{h.subtitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
