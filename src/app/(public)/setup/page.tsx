import Link from "next/link";
import { getDb } from "@/server/db/connection";
import { setupState } from "@/server/domain/setup";
import { firstAdminAction } from "@/server/actions/setup";
import { Notice } from "@/components/ui";
import { ActionForm, Submit, TextField } from "@/components/forms";

export const metadata = { title: "First-time setup", robots: { index: false, follow: false } };

/** One-time creation of the first Superadmin on a new, empty database (src/server/domain/setup.ts). */
export default async function SetupPage() {
  const state = await setupState(getDb());
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-[28px] font-extrabold tracking-tight text-[#0d1b3e]">First-time setup</h1>
      {state === "COMPLETED" && (
        <div className="mt-4 space-y-3">
          <Notice tone="info">Setup has been completed on this system. Accounts are created by administrators.</Notice>
          <p className="text-sm"><Link href="/login" className="font-semibold text-zp-blue hover:underline">Go to sign-in</Link></p>
        </div>
      )}
      {state === "NO_TOKEN" && (
        <Notice tone="warn">This database has no accounts, but setup is not enabled. The server administrator must set a one-time <code>ZPS_SETUP_TOKEN</code> (at least 24 characters) in the server configuration and restart the application.</Notice>
      )}
      {state === "AVAILABLE" && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-ink-2">Create the first Superadmin account. It holds technical administration only (accounts, organisation structure, configuration), not business approval authority. This page stops working as soon as one account exists.</p>
          <ActionForm action={firstAdminAction}>
            <TextField label="Setup token" name="token" type="password" required hint="The one-time token from the server configuration (ZPS_SETUP_TOKEN)." />
            <TextField label="Username" name="username" required maxLength={80} />
            <TextField label="Full name" name="displayName" required maxLength={120} />
            <TextField label="Position title" name="positionTitle" required maxLength={120} />
            <Submit>Create the first Superadmin</Submit>
          </ActionForm>
          <Notice tone="info">After setup, remove <code>ZPS_SETUP_TOKEN</code> from the server configuration.</Notice>
        </div>
      )}
    </div>
  );
}
