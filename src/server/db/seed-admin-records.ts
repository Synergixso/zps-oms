/**
 * Synthetic seed step for Module 16 (administrative calendar) and Module 17 (correspondence).
 * Development databases only (runSeedSteps refuses databases holding non-synthetic users). Created through the
 * domain functions, so every example passes the same validation, scope and audit rules as user input.
 * All names and references are synthetic ("Demo", "DEMO/").
 */
import type { DB } from "./connection";
import { addDays, today } from "../domain/core";
import { loadActor } from "../domain/policy";
import { createEvent } from "../domain/schedule";
import { assignCorrespondence, registerCorrespondence, setCorrespondenceStatus } from "../domain/correspondence";

export async function seedAdminRecords(db: DB) {
  const A = async (id: string) => {
    const a = await loadActor(db, id);
    if (!a) throw new Error(`seed actor ${id} missing`);
    return a;
  };
  const t = today();
  const staff = await A("u_cb_sops");
  await createEvent(db, staff, { orgUnitId: "org_cb", title: "Demo divisional personnel records review", category: "REVIEW", eventDate: addDays(t, 2), startTime: "09:00", endTime: "11:00", notes: "Quarterly review of personnel register completeness (synthetic)." });
  await createEvent(db, staff, { orgUnitId: "org_cb", title: "Demo manpower returns deadline", category: "DEADLINE", eventDate: addDays(t, 6) });
  await createEvent(db, await A("u_kit_ops"), { orgUnitId: "org_cb_kitwe", title: "Demo district administrative staff meeting", category: "MEETING", eventDate: addDays(t, 4), startTime: "14:00", endTime: "15:30" });
  await createEvent(db, await A("u_hqc"), { orgUnitId: "org_hq", title: "Demo national tenure-policy working session", category: "MEETING", eventDate: addDays(t, 9), startTime: "10:00" });

  const c1 = await registerCorrespondence(db, staff, {
    orgUnitId: "org_cb", direction: "INCOMING", subject: "Demo request for updated divisional establishment returns", counterpartOrgId: "org_hq",
    letterReference: "DEMO/HQ/OPS/014", letterDate: addDays(t, -3), registerDate: addDays(t, -2), followUpDate: addDays(t, 5),
    summary: "Headquarters asks for the quarterly establishment return (synthetic).",
  });
  await assignCorrespondence(db, staff, c1.id, "u_cb_asg", "Demo: prepare the return for signature");
  await setCorrespondenceStatus(db, await A("u_cb_asg"), c1.id, "IN_PROGRESS");
  const c2 = await registerCorrespondence(db, staff, {
    orgUnitId: "org_cb", direction: "OUTGOING", subject: "Demo reply on administrative duty-area records", counterpartName: "Demo Provincial Administration Registry",
    letterReference: "DEMO/CB/ADM/088", letterDate: addDays(t, -10), registerDate: addDays(t, -10), followUpDate: addDays(t, -1),
  });
  await assignCorrespondence(db, staff, c2.id, "u_cb_asg");
  await setCorrespondenceStatus(db, await A("u_cb_asg"), c2.id, "IN_PROGRESS");
  await setCorrespondenceStatus(db, await A("u_cb_asg"), c2.id, "AWAITING_REPLY");
  await registerCorrespondence(db, await A("u_kit_ops"), {
    orgUnitId: "org_cb_kitwe", direction: "INCOMING", subject: "Demo station returns schedule for the next quarter", counterpartOrgId: "org_cb_kitwe_central",
    registerDate: t, classification: "UNCLASSIFIED",
  });
}
