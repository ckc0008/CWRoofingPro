import { pgTable, text, integer, doublePrecision, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── LEADS / CRM ────────────────────────────────────────────────────────────

export const leads = pgTable("leads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default("TX"),
  zip: text("zip").notNull().default(""),
  source: text("source").notNull().default("manual"), // manual, website, referral, storm-alert
  status: text("status").notNull().default("new"), // new, contacted, inspected, quoted, won, lost
  notes: text("notes"),
  assignedTo: text("assigned_to"),
  roofAge: integer("roof_age"),
  roofType: text("roof_type"),
  insuranceClaim: boolean("insurance_claim").default(false),
  insuranceCompany: text("insurance_company"),
  claimNumber: text("claim_number"),
  followUpDate: text("follow_up_date"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  createdAt: true, updatedAt: true,
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// ─── JOBS ────────────────────────────────────────────────────────────────────

export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id").notNull(),
  jobNumber: text("job_number").notNull(),
  status: text("status").notNull().default("inspection"), // inspection, estimate-sent, approved, in-progress, complete, invoiced, paid
  jobType: text("job_type").notNull().default("roof-replacement"), // roof-replacement, roof-repair, gutters, siding, storm-damage
  scheduledDate: text("scheduled_date"),
  completedDate: text("completed_date"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  depositAmount: numeric("deposit_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  depositPaid: boolean("deposit_paid").default(false),
  materialBrand: text("material_brand"),
  materialColor: text("material_color"),
  warrantyYears: integer("warranty_years"),
  crewLead: text("crew_lead"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  createdAt: true, updatedAt: true,
});
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// ─── ESTIMATES ───────────────────────────────────────────────────────────────

export const estimates = pgTable("estimates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id").notNull(),
  jobId: integer("job_id"),
  estimateNumber: text("estimate_number").notNull(),
  status: text("status").notNull().default("draft"), // draft, sent, viewed, approved, rejected
  roofSquares: doublePrecision("roof_squares").default(0),
  roofPitch: text("roof_pitch").default("6/12"),
  roofType: text("roof_type").default("asphalt-shingle"),
  laborCost: numeric("labor_cost", { precision: 14, scale: 2, mode: "number" }).default(0),
  materialCost: numeric("material_cost", { precision: 14, scale: 2, mode: "number" }).default(0),
  tearOffCost: numeric("tear_off_cost", { precision: 14, scale: 2, mode: "number" }).default(0),
  dumpsterCost: numeric("dumpster_cost", { precision: 14, scale: 2, mode: "number" }).default(0),
  permitCost: numeric("permit_cost", { precision: 14, scale: 2, mode: "number" }).default(0),
  gutterCost: numeric("gutter_cost", { precision: 14, scale: 2, mode: "number" }).default(0),
  miscCost: numeric("misc_cost", { precision: 14, scale: 2, mode: "number" }).default(0),
  subtotal: numeric("subtotal", { precision: 14, scale: 2, mode: "number" }).default(0),
  taxRate: numeric("tax_rate", { precision: 14, scale: 6, mode: "number" }).default(0.0825),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  measurementMethod: text("measurement_method").default("satellite"), // satellite, manual, google-solar
  measurementData: text("measurement_data"), // JSON string with detailed measurements
  addressLat: doublePrecision("address_lat"),
  addressLng: doublePrecision("address_lng"),
  notes: text("notes"),
  validUntil: text("valid_until"),
  sentAt: text("sent_at"),
  viewedAt: text("viewed_at"),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  createdAt: true, updatedAt: true,
});
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;

// ─── WEATHER / HAIL ALERTS ───────────────────────────────────────────────────

export const stormAlerts = pgTable("storm_alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventDate: text("event_date").notNull(),
  stormType: text("storm_type").notNull(), // hail, wind, tornado, hurricane
  severity: text("severity").notNull().default("moderate"), // minor, moderate, severe, extreme
  maxHailSize: doublePrecision("max_hail_size"), // inches
  maxWindSpeed: doublePrecision("max_wind_speed"), // mph
  affectedZips: text("affected_zips").notNull(), // JSON array
  affectedLeads: text("affected_leads"), // JSON array of lead IDs
  leadsNotified: boolean("leads_notified").default(false),
  source: text("source").default("noaa"), // noaa, manual
  description: text("description"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertStormAlertSchema = createInsertSchema(stormAlerts).omit({
  createdAt: true,
});
export type InsertStormAlert = z.infer<typeof insertStormAlertSchema>;
export type StormAlert = typeof stormAlerts.$inferSelect;

// ─── PROJECTS / PHOTO REPORTS ────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id"),
  jobId: integer("job_id"),
  name: text("name").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("active"), // active, complete, archived
  type: text("type").notNull().default("inspection"), // inspection, damage-assessment, progress, completion
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  createdAt: true, updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const photos = pgTable("photos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  tag: text("tag").default("general"), // general, damage, before, after, progress, materials
  aiDescription: text("ai_description"),
  aiDamageLevel: text("ai_damage_level"), // none, minor, moderate, severe
  aiAnalyzed: boolean("ai_analyzed").default(false),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  takenAt: text("taken_at"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  createdAt: true,
});
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

// ─── EMAIL AUTOMATIONS ───────────────────────────────────────────────────────

export const emailLogs = pgTable("email_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull(), // welcome, follow-up, estimate, storm-alert, appointment, completion
  status: text("status").notNull().default("pending"), // pending, sent, failed
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  createdAt: true,
});
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// ─── ROOF MEASUREMENTS (standalone) ────────────────────────────────────────

export const measurements = pgTable("measurements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  squares: doublePrecision("squares"),
  totalArea: doublePrecision("total_area"),
  pitch: text("pitch"),
  facets: integer("facets"),
  ridgeLength: doublePrecision("ridge_length"),
  valleyLength: doublePrecision("valley_length"),
  eaveLength: doublePrecision("eave_length"),
  hipLength: doublePrecision("hip_length"),
  rakeLength: doublePrecision("rake_length"),
  source: text("source").default("satellite"), // satellite, google-solar, manual, demo
  rawData: text("raw_data"), // JSON
  linkedLeadId: integer("linked_lead_id"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertMeasurementSchema = createInsertSchema(measurements).omit({ createdAt: true });
export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;
export type Measurement = typeof measurements.$inferSelect;

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ updatedAt: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// ─── INSURANCE CLAIMS ────────────────────────────────────────────────────────

export const insuranceClaims = pgTable("insurance_claims", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id"),
  jobId: integer("job_id"),
  carrier: text("carrier").notNull(),
  policyNumber: text("policy_number"),
  claimNumber: text("claim_number"),
  adjusterName: text("adjuster_name"),
  adjusterPhone: text("adjuster_phone"),
  adjusterEmail: text("adjuster_email"),
  dateFiled: text("date_filed"),
  dateInspection: text("date_inspection"),
  dateApproved: text("date_approved"),
  status: text("status").notNull().default("filed"), // filed, pending, approved, supplemented, closed, denied
  initialAmount: numeric("initial_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  approvedAmount: numeric("approved_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  mortgageCompany: text("mortgage_company"),
  checkEndorsementStatus: text("check_endorsement_status").default("pending"), // pending, received, endorsed, deposited
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertInsuranceClaimSchema = createInsertSchema(insuranceClaims).omit({ createdAt: true, updatedAt: true });
export type InsertInsuranceClaim = z.infer<typeof insertInsuranceClaimSchema>;
export type InsuranceClaim = typeof insuranceClaims.$inferSelect;

// ─── CONTRACTS ───────────────────────────────────────────────────────────────

export const contracts = pgTable("contracts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id"),
  jobId: integer("job_id"),
  estimateId: integer("estimate_id"),
  contractNumber: text("contract_number").notNull(),
  status: text("status").notNull().default("draft"), // draft, sent, signed, void
  contractBody: text("contract_body"),
  homeownerName: text("homeowner_name"),
  homeownerSignature: text("homeowner_signature"), // base64 data URL
  signedAt: text("signed_at"),
  sentAt: text("sent_at"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertContractSchema = createInsertSchema(contracts).omit({ createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id"),
  jobId: integer("job_id"),
  paymentType: text("payment_type").notNull().default("deposit"), // deposit, progress, final, supplement, refund
  amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
  method: text("method").default("check"), // check, cash, card, zelle, venmo, ach
  referenceNumber: text("reference_number"),
  paidAt: text("paid_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// ─── SUPPLEMENTS ─────────────────────────────────────────────────────────────

export const supplements = pgTable("supplements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  claimId: integer("claim_id"),
  jobId: integer("job_id"),
  supplementNumber: text("supplement_number").notNull(),
  status: text("status").notNull().default("draft"), // draft, submitted, approved, rejected, partial
  submittedAt: text("submitted_at"),
  approvedAt: text("approved_at"),
  requestedAmount: numeric("requested_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  approvedAmount: numeric("approved_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  lineItems: text("line_items"), // JSON string
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertSupplementSchema = createInsertSchema(supplements).omit({ createdAt: true, updatedAt: true });
export type InsertSupplement = z.infer<typeof insertSupplementSchema>;
export type Supplement = typeof supplements.$inferSelect;

// ─── SUBCONTRACTORS ───────────────────────────────────────────────────────────

export const subcontractors = pgTable("subcontractors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  trade: text("trade").default("roofing"), // roofing, gutters, siding, general, electrical, plumbing
  rateType: text("rate_type").default("per_square"), // per_square, per_job, hourly
  rate: numeric("rate", { precision: 14, scale: 6, mode: "number" }).default(0),
  notes: text("notes"),
  active: boolean("active").default(true),
  createdAt: text("created_at").notNull().default(""),
});

export const insertSubcontractorSchema = createInsertSchema(subcontractors).omit({ createdAt: true });
export type InsertSubcontractor = z.infer<typeof insertSubcontractorSchema>;
export type Subcontractor = typeof subcontractors.$inferSelect;

export const subcontractorAssignments = pgTable("subcontractor_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobId: integer("job_id").notNull(),
  subcontractorId: integer("subcontractor_id").notNull(),
  assignedDate: text("assigned_date"),
  completedDate: text("completed_date"),
  agreedAmount: numeric("agreed_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  paidAt: text("paid_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertSubcontractorAssignmentSchema = createInsertSchema(subcontractorAssignments).omit({ createdAt: true });
export type InsertSubcontractorAssignment = z.infer<typeof insertSubcontractorAssignmentSchema>;
export type SubcontractorAssignment = typeof subcontractorAssignments.$inferSelect;

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id"),
  jobId: integer("job_id"),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  docType: text("doc_type").default("other"), // declarations, adjuster-report, permit, contract, warranty, photo, invoice, other
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// ─── REFERRAL SOURCES ────────────────────────────────────────────────────────

export const referralSources = pgTable("referral_sources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: text("type").notNull().default("referral"), // canvass, referral, website, nextdoor, google, facebook, yard-sign, other
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  active: boolean("active").default(true),
  createdAt: text("created_at").notNull().default(""),
});

export const insertReferralSourceSchema = createInsertSchema(referralSources).omit({ createdAt: true });
export type InsertReferralSource = z.infer<typeof insertReferralSourceSchema>;
export type ReferralSource = typeof referralSources.$inferSelect;

// ─── COMMISSIONS ─────────────────────────────────────────────────────────────

export const commissions = pgTable("commissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: integer("lead_id"),
  jobId: integer("job_id"),
  salesRep: text("sales_rep").notNull(),
  commissionRate: numeric("commission_rate", { precision: 14, scale: 6, mode: "number" }).default(0.1), // 0.1 = 10%
  commissionAmount: numeric("commission_amount", { precision: 14, scale: 2, mode: "number" }).default(0),
  status: text("status").notNull().default("pending"), // pending, approved, paid
  paidAt: text("paid_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({ createdAt: true, updatedAt: true });
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;
