/**
 * M04 — Fleet Register and Maintenance Management (administrative only).
 * Deliberately excluded: GPS, live location, routes, mission purpose, crew, deployment history.
 */
import { z } from "zod";
import type { DB } from "../db/connection";
import { all, one, run, tx } from "../db/connection";
import { audit } from "./audit";
import { SERVICE_TYPES } from "./catalogue";
import { conflict, forbidden, invalid, newId, nextReference, notFound, notify, nowIso, today } from "./core";
import { type Actor, can, canApprove, requirePermission, scopeSql } from "./policy";

export const VEHICLE_STATUSES = ["IN_SERVICE", "UNDER_MAINTENANCE", "AWAITING_DISPOSAL", "DISPOSED"] as const;
export const VEHICLE_STATUS_LABEL: Record<string, string> = {
  IN_SERVICE: "In service",
  UNDER_MAINTENANCE: "Under maintenance",
  AWAITING_DISPOSAL: "Awaiting disposal",
  DISPOSED: "Disposed",
};

export interface VehicleRow {
  id: string;
  fleet_ref: string;
  registration_ref: string;
  make: string;
  model: string;
  vehicle_class: string;
  custody_org_id: string;
  custody_name: string;
  status: string;
  next_service_due: string | null;
  licence_expiry: string | null;
  insurance_expiry: string | null;
  updated_at: string;
}

const V_SELECT = `SELECT v.*, o.name AS custody_name FROM vehicles v JOIN org_units o ON o.id = v.custody_org_id`;

export function listVehicles(db: DB, actor: Actor, f: { q?: string; status?: string; due?: string } = {}): VehicleRow[] {
  requirePermission(db, actor, "fleet.view");
  const s = scopeSql(actor, "fleet.view", "v.custody_org_id");
  const where = [s.sql];
  const params: unknown[] = [...s.params];
  if (f.q) {
    where.push("(v.fleet_ref LIKE ? OR v.registration_ref LIKE ? OR v.make LIKE ? OR v.model LIKE ?)");
    params.push(...Array(4).fill(`%${f.q}%`));
  }
  if (f.status) {
    where.push("v.status = ?");
    params.push(f.status);
  }
  if (f.due === "overdue") {
    where.push("v.next_service_due < ?");
    params.push(today());
  }
  return all<VehicleRow>(db, `${V_SELECT} WHERE ${where.join(" AND ")} ORDER BY v.fleet_ref LIMIT 500`, ...params);
}

export function getVehicle(db: DB, actor: Actor, id: string): VehicleRow {
  const v = one<VehicleRow>(db, `${V_SELECT} WHERE v.id = ?`, id);
  if (!v || !can(actor, "fleet.view", v.custody_org_id)) {
    audit(db, { actorId: actor.userId, action: "fleet.view", outcome: "DENIED", category: "SECURITY", entityType: "vehicle", entityId: id });
    throw notFound();
  }
  return v;
}

export const vehicleSchema = z.object({
  fleetRef: z.string().trim().regex(/^SYN-FLT-\d{4}$/, "Fleet reference must follow the synthetic pattern SYN-FLT-0000."),
  registrationRef: z.string().trim().regex(/^SYN-REG-[A-Z0-9]{3,8}$/, "Registration reference must be a synthetic placeholder (SYN-REG-…). Real registrations are not permitted."),
  make: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(40),
  vehicleClass: z.enum(["Saloon", "Utility (light)", "Station wagon", "Minibus", "Truck (general)"]),
  custodyOrgId: z.string().min(1),
  nextServiceDue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  licenceExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  insuranceExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

export function createVehicle(db: DB, actor: Actor, input: z.input<typeof vehicleSchema>): VehicleRow {
  requirePermission(db, actor, "fleet.manage"); // authorise before validating
  const d = vehicleSchema.parse(input);
  requirePermission(db, actor, "fleet.manage", d.custodyOrgId);
  if (one(db, "SELECT id FROM vehicles WHERE fleet_ref = ? OR registration_ref = ?", d.fleetRef, d.registrationRef)) {
    throw conflict("A vehicle with this fleet or registration reference already exists.");
  }
  const id = newId("veh");
  tx(db, () => {
    const t = nowIso();
    run(db, `INSERT INTO vehicles (id, fleet_ref, registration_ref, make, model, vehicle_class, custody_org_id, status, next_service_due, licence_expiry, insurance_expiry, created_at, updated_at)
             VALUES (?,?,?,?,?,?,?, 'IN_SERVICE', ?,?,?,?,?)`,
      id, d.fleetRef, d.registrationRef, d.make, d.model, d.vehicleClass, d.custodyOrgId, d.nextServiceDue || null, d.licenceExpiry || null, d.insuranceExpiry || null, t, t);
    audit(db, { actorId: actor.userId, action: "fleet.vehicle.create", category: "BUSINESS", entityType: "vehicle", entityId: id, orgUnitId: d.custodyOrgId, details: { fleetRef: d.fleetRef } });
  });
  return getVehicle(db, actor, id);
}

export function updateVehicleAdmin(db: DB, actor: Actor, id: string, input: { status?: string; nextServiceDue?: string; licenceExpiry?: string; insuranceExpiry?: string }) {
  const v = getVehicle(db, actor, id);
  requirePermission(db, actor, "fleet.manage", v.custody_org_id, { type: "vehicle", id });
  if (v.status === "DISPOSED") throw conflict("Disposed vehicles cannot be edited.");
  const status = input.status ?? v.status;
  if (!(VEHICLE_STATUSES as readonly string[]).includes(status)) throw invalid("Invalid status.");
  const dateOk = (x?: string) => !x || /^\d{4}-\d{2}-\d{2}$/.test(x);
  if (![input.nextServiceDue, input.licenceExpiry, input.insuranceExpiry].every(dateOk)) throw invalid("Dates must be YYYY-MM-DD.");
  tx(db, () => {
    run(db, "UPDATE vehicles SET status = ?, next_service_due = ?, licence_expiry = ?, insurance_expiry = ?, updated_at = ? WHERE id = ?",
      status, input.nextServiceDue || v.next_service_due, input.licenceExpiry || v.licence_expiry, input.insuranceExpiry || v.insurance_expiry, nowIso(), id);
    audit(db, {
      actorId: actor.userId, action: "fleet.vehicle.update", category: "BUSINESS", entityType: "vehicle", entityId: id, orgUnitId: v.custody_org_id,
      details: { before: { status: v.status, next: v.next_service_due }, after: { status, next: input.nextServiceDue } },
    });
  });
}

// ---- Maintenance ----------------------------------------------------------

export const MAINT_STATUSES = ["REQUESTED", "VALIDATED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETION_SUBMITTED", "CLOSED", "REJECTED"] as const;
export type MaintStatus = (typeof MAINT_STATUSES)[number];
export const MAINT_LABEL: Record<MaintStatus, string> = {
  REQUESTED: "Requested",
  VALIDATED: "Awaiting approval",
  APPROVED: "Approved",
  ASSIGNED: "Referred to workshop",
  IN_PROGRESS: "Work in progress",
  COMPLETION_SUBMITTED: "Completion submitted",
  CLOSED: "Verified & closed",
  REJECTED: "Rejected",
};

export type MaintAction = "VALIDATE" | "APPROVE" | "REJECT" | "REFER" | "START" | "SUBMIT_COMPLETION" | "RETURN_TO_WORKSHOP" | "VERIFY";

export const MAINT_TRANSITIONS: Record<MaintAction, MaintStatus[]> = {
  VALIDATE: ["REQUESTED"],
  APPROVE: ["VALIDATED"],
  REJECT: ["REQUESTED", "VALIDATED"],
  REFER: ["APPROVED"],
  START: ["ASSIGNED"],
  SUBMIT_COMPLETION: ["IN_PROGRESS"],
  RETURN_TO_WORKSHOP: ["COMPLETION_SUBMITTED"],
  VERIFY: ["COMPLETION_SUBMITTED"],
};

export interface MaintRow {
  id: string;
  reference: string;
  vehicle_id: string;
  fleet_ref: string;
  make: string;
  model: string;
  org_unit_id: string;
  org_name: string;
  service_type: string;
  description: string;
  estimated_cost: number | null;
  approval_required: number;
  status: MaintStatus;
  workshop_ref: string | null;
  requested_by: string;
  requester_name: string;
  created_at: string;
  updated_at: string;
}

const M_SELECT = `SELECT m.*, v.fleet_ref, v.make, v.model, o.name AS org_name, u.display_name AS requester_name
  FROM maintenance_requests m JOIN vehicles v ON v.id = m.vehicle_id JOIN org_units o ON o.id = m.org_unit_id JOIN users u ON u.id = m.requested_by`;

export function approvalThreshold(db: DB): number {
  return Number(one<{ value: string }>(db, "SELECT value FROM app_settings WHERE key = 'maintenance.approval_threshold_zmw'")?.value ?? 5000);
}

export function listMaintenance(db: DB, actor: Actor, f: { status?: string; vehicleId?: string; q?: string } = {}): MaintRow[] {
  requirePermission(db, actor, "maintenance.view");
  const s = scopeSql(actor, "maintenance.view", "m.org_unit_id");
  const where = [s.sql];
  const params: unknown[] = [...s.params];
  if (f.status) { where.push("m.status = ?"); params.push(f.status); }
  if (f.vehicleId) { where.push("m.vehicle_id = ?"); params.push(f.vehicleId); }
  if (f.q) { where.push("(m.reference LIKE ? OR v.fleet_ref LIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`); }
  return all<MaintRow>(db, `${M_SELECT} WHERE ${where.join(" AND ")} ORDER BY m.updated_at DESC LIMIT 500`, ...params);
}

export function getMaintenance(db: DB, actor: Actor, id: string): MaintRow {
  const m = one<MaintRow>(db, `${M_SELECT} WHERE m.id = ?`, id);
  if (!m || !can(actor, "maintenance.view", m.org_unit_id)) {
    audit(db, { actorId: actor.userId, action: "maintenance.view", outcome: "DENIED", category: "SECURITY", entityType: "maintenance", entityId: id });
    throw notFound();
  }
  return m;
}

export function maintenanceHistory(db: DB, actor: Actor, id: string) {
  getMaintenance(db, actor, id);
  return all<{ action: string; from_status: string | null; to_status: string; note: string | null; created_at: string; actor_name: string }>(
    db,
    "SELECT h.*, u.display_name AS actor_name FROM maintenance_actions h JOIN users u ON u.id = h.actor_id WHERE h.maintenance_id = ? ORDER BY h.created_at, h.rowid",
    id,
  );
}

export const maintSchema = z.object({
  vehicleId: z.string().min(1),
  serviceType: z.enum(SERVICE_TYPES as unknown as [string, ...string[]]),
  description: z.string().trim().min(10, "Describe the maintenance need (at least 10 characters).").max(1000),
  estimatedCost: z.coerce.number().int().min(0).max(10_000_000).optional(),
});

export function createMaintenance(db: DB, actor: Actor, input: z.input<typeof maintSchema>): MaintRow {
  const d = maintSchema.parse(input);
  const v = getVehicle(db, actor, d.vehicleId);
  requirePermission(db, actor, "maintenance.create", v.custody_org_id, { type: "vehicle", id: v.id });
  if (v.status === "DISPOSED") throw conflict("Maintenance cannot be requested for a disposed vehicle.");
  const open = one(db, "SELECT id FROM maintenance_requests WHERE vehicle_id = ? AND status NOT IN ('CLOSED','REJECTED')", v.id);
  if (open) throw conflict("This vehicle already has an open maintenance request.");
  const approvalRequired = (d.estimatedCost ?? 0) >= approvalThreshold(db) ? 1 : 0;
  const id = newId("mnt");
  tx(db, () => {
    const t = nowIso();
    const ref = nextReference(db, "MNT", "maintenance_requests");
    run(db, `INSERT INTO maintenance_requests (id, reference, vehicle_id, org_unit_id, service_type, description, estimated_cost, approval_required, status, requested_by, created_at, updated_at)
             VALUES (?,?,?,?,?,?,?,?, 'REQUESTED', ?,?,?)`,
      id, ref, v.id, v.custody_org_id, d.serviceType, d.description, d.estimatedCost ?? null, approvalRequired, actor.userId, t, t);
    run(db, "INSERT INTO maintenance_actions (id, maintenance_id, actor_id, action, from_status, to_status, created_at) VALUES (?,?,?,?,?,?,?)",
      newId("mna"), id, actor.userId, "REQUEST", null, "REQUESTED", t);
    audit(db, { actorId: actor.userId, action: "maintenance.create", category: "BUSINESS", entityType: "maintenance", entityId: id, orgUnitId: v.custody_org_id, details: { reference: ref, vehicle: v.fleet_ref } });
  });
  return getMaintenance(db, actor, id);
}

export function maintenanceAction(db: DB, actor: Actor, id: string, action: MaintAction, input: { note?: string; workshopRef?: string; costRef?: string } = {}): MaintRow {
  const m = getMaintenance(db, actor, id);
  const from = MAINT_TRANSITIONS[action];
  if (!from) throw invalid("Unknown maintenance action.");
  if (!from.includes(m.status)) throw conflict(`Action not permitted while the request is "${MAINT_LABEL[m.status]}".`);
  const ent = { type: "maintenance", id };
  const note = input.note?.trim() || null;
  let to: MaintStatus;
  let vehicleStatus: string | null = null;
  let serviceRecord = false;
  switch (action) {
    case "VALIDATE":
      requirePermission(db, actor, "maintenance.process", m.org_unit_id, ent);
      to = m.approval_required ? "VALIDATED" : "APPROVED";
      break;
    case "APPROVE":
      if (!canApprove(db, actor, "MAINTENANCE", m.org_unit_id)) throw forbidden("No recorded maintenance-approval delegation for this organisation.");
      if (m.requested_by === actor.userId) throw forbidden("Self-approval is not permitted.");
      to = "APPROVED";
      break;
    case "REJECT":
      if (m.status === "VALIDATED") {
        if (!canApprove(db, actor, "MAINTENANCE", m.org_unit_id)) throw forbidden("No recorded maintenance-approval delegation for this organisation.");
      } else requirePermission(db, actor, "maintenance.process", m.org_unit_id, ent);
      if (!note || note.length < 5) throw invalid("A rejection reason of at least 5 characters is required.");
      to = "REJECTED";
      break;
    case "REFER":
      requirePermission(db, actor, "maintenance.process", m.org_unit_id, ent);
      if (!input.workshopRef || !/^[A-Za-z0-9 \-/]{3,40}$/.test(input.workshopRef)) throw invalid("Enter a workshop referral reference (3–40 letters, digits, spaces, - or /).");
      to = "ASSIGNED";
      break;
    case "START":
      requirePermission(db, actor, "maintenance.process", m.org_unit_id, ent);
      to = "IN_PROGRESS";
      vehicleStatus = "UNDER_MAINTENANCE";
      break;
    case "SUBMIT_COMPLETION":
      requirePermission(db, actor, "maintenance.process", m.org_unit_id, ent);
      to = "COMPLETION_SUBMITTED";
      break;
    case "RETURN_TO_WORKSHOP":
      requirePermission(db, actor, "maintenance.verify", m.org_unit_id, ent);
      if (!note) throw invalid("State why the work is being returned.");
      to = "IN_PROGRESS";
      break;
    case "VERIFY": {
      requirePermission(db, actor, "maintenance.verify", m.org_unit_id, ent);
      const submitter = one<{ actor_id: string }>(db, "SELECT actor_id FROM maintenance_actions WHERE maintenance_id = ? AND action = 'SUBMIT_COMPLETION' ORDER BY created_at DESC, rowid DESC LIMIT 1", id);
      if (submitter?.actor_id === actor.userId) throw forbidden("Completion must be verified by a different officer from the one who submitted it.");
      to = "CLOSED";
      vehicleStatus = "IN_SERVICE";
      serviceRecord = true;
      break;
    }
  }
  tx(db, () => {
    const t = nowIso();
    run(db, "UPDATE maintenance_requests SET status = ?, workshop_ref = COALESCE(?, workshop_ref), updated_at = ? WHERE id = ?", to, input.workshopRef ?? null, t, id);
    run(db, "INSERT INTO maintenance_actions (id, maintenance_id, actor_id, action, from_status, to_status, note, created_at) VALUES (?,?,?,?,?,?,?,?)",
      newId("mna"), id, actor.userId, action, m.status, to, note, t);
    if (vehicleStatus) run(db, "UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?", vehicleStatus, t, m.vehicle_id);
    if (serviceRecord) {
      run(db, `INSERT INTO service_records (id, vehicle_id, maintenance_id, service_date, service_type, workshop_ref, cost_ref, notes, recorded_by, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)`,
        newId("svc"), m.vehicle_id, id, t.slice(0, 10), m.service_type, m.workshop_ref, input.costRef ?? null, note, actor.userId, t);
      if (m.service_type === "Routine service") {
        run(db, "UPDATE vehicles SET next_service_due = date(?, '+6 months') WHERE id = ?", t.slice(0, 10), m.vehicle_id);
      }
    }
    if (m.requested_by !== actor.userId) notify(db, m.requested_by, `Maintenance ${m.reference}: ${MAINT_LABEL[to]}`, `${m.fleet_ref} — ${m.service_type}`, `/app/fleet/maintenance/${id}`);
    audit(db, { actorId: actor.userId, action: `maintenance.${action.toLowerCase()}`, category: "BUSINESS", entityType: "maintenance", entityId: id, orgUnitId: m.org_unit_id, details: { from: m.status, to } });
  });
  return getMaintenance(db, actor, id);
}

export function maintenanceActions(db: DB, actor: Actor, m: MaintRow): MaintAction[] {
  const out: MaintAction[] = [];
  const p = (perm: Parameters<typeof can>[1]) => can(actor, perm, m.org_unit_id);
  if (m.status === "REQUESTED" && p("maintenance.process")) out.push("VALIDATE", "REJECT");
  if (m.status === "VALIDATED" && canApprove(db, actor, "MAINTENANCE", m.org_unit_id) && m.requested_by !== actor.userId) out.push("APPROVE", "REJECT");
  if (m.status === "APPROVED" && p("maintenance.process")) out.push("REFER");
  if (m.status === "ASSIGNED" && p("maintenance.process")) out.push("START");
  if (m.status === "IN_PROGRESS" && p("maintenance.process")) out.push("SUBMIT_COMPLETION");
  if (m.status === "COMPLETION_SUBMITTED" && p("maintenance.verify")) out.push("VERIFY", "RETURN_TO_WORKSHOP");
  return out;
}

export function serviceHistory(db: DB, actor: Actor, vehicleId: string) {
  getVehicle(db, actor, vehicleId);
  return all<{ id: string; service_date: string; service_type: string; workshop_ref: string | null; cost_ref: string | null; notes: string | null; recorder: string }>(
    db,
    "SELECT s.*, u.display_name AS recorder FROM service_records s JOIN users u ON u.id = s.recorded_by WHERE s.vehicle_id = ? ORDER BY s.service_date DESC",
    vehicleId,
  );
}

export const serviceRecordSchema = z.object({
  vehicleId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Service date must be YYYY-MM-DD."),
  serviceType: z.enum(SERVICE_TYPES as unknown as [string, ...string[]]),
  workshopRef: z.string().trim().max(40).optional(),
  costRef: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
});

export function recordService(db: DB, actor: Actor, input: z.input<typeof serviceRecordSchema>) {
  const d = serviceRecordSchema.parse(input);
  const v = getVehicle(db, actor, d.vehicleId);
  requirePermission(db, actor, "service.record", v.custody_org_id, { type: "vehicle", id: v.id });
  if (d.serviceDate > today()) throw invalid("Service date cannot be in the future.");
  tx(db, () => {
    const id = newId("svc");
    run(db, `INSERT INTO service_records (id, vehicle_id, service_date, service_type, workshop_ref, cost_ref, notes, recorded_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      id, v.id, d.serviceDate, d.serviceType, d.workshopRef || null, d.costRef || null, d.notes || null, actor.userId, nowIso());
    audit(db, { actorId: actor.userId, action: "fleet.service.record", category: "BUSINESS", entityType: "vehicle", entityId: v.id, orgUnitId: v.custody_org_id, details: { serviceDate: d.serviceDate, type: d.serviceType } });
  });
}
