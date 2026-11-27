import { identifierHint, identifierRule } from "@/server/lib/identifiers";
import { requireActor } from "@/server/auth/session";
import { pageAllowed } from "@/server/auth/guard";
import { ASSET_CATEGORIES } from "@/server/domain/catalogue";
import { scopeFor } from "@/server/domain/policy";
import { CONDITIONS } from "@/server/domain/assets";
import { registerAssetAction } from "@/server/actions/assets";
import { AccessDenied, Card, PageHeader } from "@/components/ui";
import { ActionForm, Select, Submit, TextField } from "@/components/forms";

export const metadata = { title: "Register asset" };

export default async function NewAsset() {
  const actor = await requireActor();
  if (!await pageAllowed(actor, "asset.register")) return <AccessDenied what="asset registration" />;
  const units = scopeFor(actor, "asset.register").units;
  const orgs = [...new Map(actor.assignments.filter((a) => units.includes(a.orgUnitId)).map((a) => [a.orgUnitId, { value: a.orgUnitId, label: a.orgUnitName }])).values()];
  return (
    <>
      <PageHeader eyebrow="M05 · General assets" title="Register asset" description="Only categories on the approved allowlist can be registered." />
      <Card className="max-w-3xl">
        <ActionForm action={registerAssetAction}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Asset tag" name="assetTag" required placeholder={identifierRule("assetTag").synthetic ? "SYN-AST-00000" : undefined} hint={identifierHint("assetTag")} />
            <Select label="Category (approved allowlist)" name="categoryCode" required placeholder="Select a category" options={ASSET_CATEGORIES.map((c) => ({ value: c.code, label: c.name }))} />
            <TextField label="Description" name="description" required maxLength={120} />
            <Select label="Condition" name="condition" defaultValue="GOOD" options={CONDITIONS.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))} />
            <Select label="Custody organisation" name="custodyOrgId" required options={orgs} />
            <TextField label="Custodian reference (office/post)" name="custodianRef" maxLength={60} hint="An office or post reference — not a person's name." />
          </div>
          <Submit>Register asset</Submit>
        </ActionForm>
      </Card>
    </>
  );
}
