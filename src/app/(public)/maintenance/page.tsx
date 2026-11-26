import Link from "next/link";
import { signOut } from "@/server/actions/auth";

export const metadata = { title: "Scheduled maintenance" };

export default function Maintenance() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zp-green">ZPS-OMS</p>
      <h1 className="mt-2 text-2xl font-bold text-[#0d2149]">The system is under maintenance</h1>
      <p className="mt-3 text-sm text-ink-2">
        The platform administrator has placed ZPS-OMS in maintenance mode. Your work is safe; please try again later. Contact ICT support if the matter is urgent.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/contact" className="rounded-md border border-line-2 px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50">ICT support</Link>
        <form action={signOut}>
          <button type="submit" className="rounded-md bg-zp-green px-4 py-2 text-sm font-semibold text-white hover:bg-zp-green-dark">Sign out</button>
        </form>
      </div>
    </div>
  );
}
