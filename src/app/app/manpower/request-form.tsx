import { MPR_CATEGORIES, type MprRow } from "@/server/domain/manpower";
import { Select, TextArea, TextField } from "@/components/forms";

type Opt = { value: string; label: string };

/** Shared fields for creating and editing a manpower request (no tactical, position or route fields exist). */
export function RequestFields({ units, approvalUnits, areas, m }: { units: Opt[]; approvalUnits: Opt[]; areas: Opt[]; m?: MprRow }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {m ? (
          <div>
            <p className="block text-[13px] font-semibold text-ink">Requesting unit</p>
            <p className="mt-1 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink-2">{m.requesting_unit_name}</p>
          </div>
        ) : (
          <Select label="Requesting unit" name="requestingUnitId" required placeholder="Select unit" options={units} />
        )}
        <Select label="Administrative category" name="category" required defaultValue={m?.category} options={Object.entries(MPR_CATEGORIES).map(([value, label]) => ({ value, label }))} />
      </div>
      <TextField label="General purpose" name="purpose" required maxLength={200} defaultValue={m?.purpose} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Approved duty-area reference" name="areaId" defaultValue={m?.area_id ?? ""} placeholder="None (not an area assignment)" options={areas} hint="Finalising the roster creates assignments to this area." />
        <Select label="Approval authority" name="approvalUnitId" required defaultValue={m?.approval_unit_id} placeholder="Select approving unit" options={approvalUnits} hint="The requesting unit or a unit above it. Approval needs a MANPOWER delegation there." />
        <TextField label="Required personnel" name="totalRequired" type="number" required defaultValue={m?.total_required} />
        <TextField label="Applicable personnel categories" name="personnelCategories" required defaultValue={m?.personnel_categories} placeholder="e.g. Constables and Sergeants" />
        <TextField label="Proposed commencement date" name="commencementDate" type="date" required defaultValue={m?.commencement_date} />
        <TextField label="Proposed duration (days)" name="durationDays" type="number" required defaultValue={m?.duration_days ?? 365} />
      </div>
      <TextArea label="Administrative justification" name="justification" required rows={4} defaultValue={m?.justification} hint="Administrative reasons only — no tactical plans, positions, routes or deployment instructions." />
    </>
  );
}
