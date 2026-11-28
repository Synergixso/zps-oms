import { requireActor } from "@/server/auth/session";
import { hasPermission } from "@/server/domain/policy";
import { ESTABLISHMENT_COLUMNS, PERSONNEL_COLUMNS } from "@/server/domain/data-import";
import { isProduction } from "@/server/lib/environment";
import { AccessDenied, Card, Notice, PageHeader } from "@/components/ui";
import { ImportForm } from "@/components/import-form";

export const metadata = { title: "Controlled data import" };

/** Controlled import of establishment and personnel data (issue #8). Every rule is enforced in `domain/data-import.ts`. */
export default async function ImportPage() {
  const actor = await requireActor();
  const personnel = hasPermission(actor, "personnel.register");
  const establishment = hasPermission(actor, "org.propose");
  if (!personnel && !establishment) return <AccessDenied />;
  return (
    <>
      <PageHeader eyebrow="Registry administration" title="Controlled data import"
        description="Validate a CSV file, review every row, then import all of it or none of it. Every import is audited with the file's fingerprint; the file itself is not stored." />
      <div className="mb-4">
        <Notice tone={isProduction() ? "info" : "warn"} title={isProduction() ? "Production" : "Development environment — synthetic data only"}>
          {isProduction()
            ? "Import only data authorised for this system, in the Service's official identifier formats."
            : "Real personnel data must never be loaded here. Service numbers must be synthetic (SYN- followed by 6 digits); real-looking numbers are refused."}
        </Notice>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {personnel && (
          <Card title="Personnel records" subtitle="Registered directly, within your personnel registration scope; one canonical record per service number">
            <ImportForm kind="PERSONNEL" columns={PERSONNEL_COLUMNS} />
          </Card>
        )}
        {establishment && (
          <Card title="Establishment (organisation units)" subtitle="Each row becomes an organisation change proposal; units enter the directory only after a different officer approves it">
            <ImportForm kind="ESTABLISHMENT" columns={ESTABLISHMENT_COLUMNS} />
          </Card>
        )}
      </div>
    </>
  );
}
