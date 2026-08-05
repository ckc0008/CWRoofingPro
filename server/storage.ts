import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, like, or, and, inArray } from "drizzle-orm";
import {
  leads, jobs, estimates, stormAlerts, projects, photos, emailLogs, measurements, settings,
  insuranceClaims, contracts, payments, supplements, subcontractors, subcontractorAssignments, documents, referralSources, commissions,
  type Lead, type InsertLead,
  type Job, type InsertJob,
  type Estimate, type InsertEstimate,
  type StormAlert, type InsertStormAlert,
  type Project, type InsertProject,
  type Photo, type InsertPhoto,
  type EmailLog, type InsertEmailLog,
  type Measurement, type InsertMeasurement,
  type Setting, type InsertSetting,
  type InsuranceClaim, type InsertInsuranceClaim,
  type Contract, type InsertContract,
  type Payment, type InsertPayment,
  type Supplement, type InsertSupplement,
  type Subcontractor, type InsertSubcontractor,
  type SubcontractorAssignment, type InsertSubcontractorAssignment,
  type Document as DocRecord, type InsertDocument,
  type ReferralSource, type InsertReferralSource,
  type Commission, type InsertCommission,
} from "@shared/schema";

const sqlite = new Database("data.db");
const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'TX',
    zip TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    assigned_to TEXT,
    roof_age INTEGER,
    roof_type TEXT,
    insurance_claim INTEGER DEFAULT 0,
    insurance_company TEXT,
    claim_number TEXT,
    follow_up_date TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    job_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inspection',
    job_type TEXT NOT NULL DEFAULT 'roof-replacement',
    scheduled_date TEXT,
    completed_date TEXT,
    total_amount REAL DEFAULT 0,
    deposit_amount REAL DEFAULT 0,
    deposit_paid INTEGER DEFAULT 0,
    material_brand TEXT,
    material_color TEXT,
    warranty_years INTEGER,
    crew_lead TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    job_id INTEGER,
    estimate_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    roof_squares REAL DEFAULT 0,
    roof_pitch TEXT DEFAULT '6/12',
    roof_type TEXT DEFAULT 'asphalt-shingle',
    labor_cost REAL DEFAULT 0,
    material_cost REAL DEFAULT 0,
    tear_off_cost REAL DEFAULT 0,
    dumpster_cost REAL DEFAULT 0,
    permit_cost REAL DEFAULT 0,
    gutter_cost REAL DEFAULT 0,
    misc_cost REAL DEFAULT 0,
    subtotal REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0.0825,
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    measurement_method TEXT DEFAULT 'satellite',
    measurement_data TEXT,
    address_lat REAL,
    address_lng REAL,
    notes TEXT,
    valid_until TEXT,
    sent_at TEXT,
    viewed_at TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS storm_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT NOT NULL,
    storm_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'moderate',
    max_hail_size REAL,
    max_wind_speed REAL,
    affected_zips TEXT NOT NULL,
    affected_leads TEXT,
    leads_notified INTEGER DEFAULT 0,
    source TEXT DEFAULT 'noaa',
    description TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    job_id INTEGER,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    type TEXT NOT NULL DEFAULT 'inspection',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    url TEXT NOT NULL,
    tag TEXT DEFAULT 'general',
    ai_description TEXT,
    ai_damage_level TEXT,
    ai_analyzed INTEGER DEFAULT 0,
    latitude REAL,
    longitude REAL,
    taken_at TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    lat REAL,
    lng REAL,
    squares REAL,
    total_area REAL,
    pitch TEXT,
    facets INTEGER,
    ridge_length REAL,
    valley_length REAL,
    eave_length REAL,
    source TEXT DEFAULT 'satellite',
    raw_data TEXT,
    linked_lead_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS insurance_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    job_id INTEGER,
    carrier TEXT NOT NULL,
    policy_number TEXT,
    claim_number TEXT,
    adjuster_name TEXT,
    adjuster_phone TEXT,
    adjuster_email TEXT,
    date_filed TEXT,
    date_inspection TEXT,
    date_approved TEXT,
    status TEXT NOT NULL DEFAULT 'filed',
    initial_amount REAL DEFAULT 0,
    approved_amount REAL DEFAULT 0,
    mortgage_company TEXT,
    check_endorsement_status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    job_id INTEGER,
    estimate_id INTEGER,
    contract_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    contract_body TEXT,
    homeowner_name TEXT,
    homeowner_signature TEXT,
    signed_at TEXT,
    sent_at TEXT,
    total_amount REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    job_id INTEGER,
    payment_type TEXT NOT NULL DEFAULT 'deposit',
    amount REAL NOT NULL DEFAULT 0,
    method TEXT DEFAULT 'check',
    reference_number TEXT,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS supplements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER,
    job_id INTEGER,
    supplement_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    submitted_at TEXT,
    approved_at TEXT,
    requested_amount REAL DEFAULT 0,
    approved_amount REAL DEFAULT 0,
    line_items TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS subcontractors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    trade TEXT DEFAULT 'roofing',
    rate_type TEXT DEFAULT 'per_square',
    rate REAL DEFAULT 0,
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS subcontractor_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    subcontractor_id INTEGER NOT NULL,
    assigned_date TEXT,
    completed_date TEXT,
    agreed_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    job_id INTEGER,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    url TEXT NOT NULL,
    doc_type TEXT DEFAULT 'other',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS referral_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'referral',
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    job_id INTEGER,
    sales_rep TEXT NOT NULL,
    commission_rate REAL DEFAULT 0.1,
    commission_amount REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );
`);

function now() { return new Date().toISOString(); }
function jobNum() { return `JOB-${Date.now().toString().slice(-6)}`; }
function estNum() { return `EST-${Date.now().toString().slice(-6)}`; }

export interface IStorage {
  // Leads
  getLeads(): Lead[];
  getLead(id: number): Lead | undefined;
  createLead(data: InsertLead): Lead;
  updateLead(id: number, data: Partial<InsertLead>): Lead | undefined;
  deleteLead(id: number): boolean;
  searchLeads(query: string): Lead[];
  getLeadsByZip(zips: string[]): Lead[];

  // Jobs
  getJobs(): Job[];
  getJob(id: number): Job | undefined;
  getJobsByLead(leadId: number): Job[];
  createJob(data: InsertJob): Job;
  updateJob(id: number, data: Partial<InsertJob>): Job | undefined;

  // Estimates
  getEstimates(): Estimate[];
  getEstimate(id: number): Estimate | undefined;
  getEstimatesByLead(leadId: number): Estimate[];
  createEstimate(data: InsertEstimate): Estimate;
  updateEstimate(id: number, data: Partial<InsertEstimate>): Estimate | undefined;

  // Storm Alerts
  getStormAlerts(): StormAlert[];
  getStormAlert(id: number): StormAlert | undefined;
  createStormAlert(data: InsertStormAlert): StormAlert;
  updateStormAlert(id: number, data: Partial<InsertStormAlert>): StormAlert | undefined;

  // Projects
  getProjects(): Project[];
  getProject(id: number): Project | undefined;
  createProject(data: InsertProject): Project;
  updateProject(id: number, data: Partial<InsertProject>): Project | undefined;

  // Photos
  getPhotosByProject(projectId: number): Photo[];
  createPhoto(data: InsertPhoto): Photo;
  updatePhoto(id: number, data: Partial<InsertPhoto>): Photo | undefined;
  deletePhoto(id: number): boolean;

  // Email Logs
  getEmailLogs(): EmailLog[];
  getEmailLogsByLead(leadId: number): EmailLog[];
  createEmailLog(data: InsertEmailLog): EmailLog;
  updateEmailLog(id: number, data: Partial<InsertEmailLog>): EmailLog | undefined;

  // Measurements
  getMeasurements(): Measurement[];
  getMeasurement(id: number): Measurement | undefined;
  createMeasurement(data: InsertMeasurement): Measurement;
  updateMeasurement(id: number, data: Partial<InsertMeasurement>): Measurement | undefined;
  deleteMeasurement(id: number): boolean;
  findLeadByAddress(address: string): Lead | undefined;
  findLeadByCoords(lat: number, lng: number): Lead | undefined;

  // Settings
  getSetting(key: string): string | undefined;
  setSetting(key: string, value: string): void;
  getAllSettings(): Setting[];

  // Insurance Claims
  getInsuranceClaims(): InsuranceClaim[];
  getInsuranceClaimsByLead(leadId: number): InsuranceClaim[];
  getInsuranceClaim(id: number): InsuranceClaim | undefined;
  createInsuranceClaim(data: InsertInsuranceClaim): InsuranceClaim;
  updateInsuranceClaim(id: number, data: Partial<InsertInsuranceClaim>): InsuranceClaim | undefined;
  deleteInsuranceClaim(id: number): boolean;

  // Contracts
  getContracts(): Contract[];
  getContractsByLead(leadId: number): Contract[];
  getContract(id: number): Contract | undefined;
  createContract(data: InsertContract): Contract;
  updateContract(id: number, data: Partial<InsertContract>): Contract | undefined;
  deleteContract(id: number): boolean;

  // Payments
  getPayments(): Payment[];
  getPaymentsByJob(jobId: number): Payment[];
  getPaymentsByLead(leadId: number): Payment[];
  createPayment(data: InsertPayment): Payment;
  updatePayment(id: number, data: Partial<InsertPayment>): Payment | undefined;
  deletePayment(id: number): boolean;

  // Supplements
  getSupplements(): Supplement[];
  getSupplementsByClaim(claimId: number): Supplement[];
  getSupplement(id: number): Supplement | undefined;
  createSupplement(data: InsertSupplement): Supplement;
  updateSupplement(id: number, data: Partial<InsertSupplement>): Supplement | undefined;
  deleteSupplement(id: number): boolean;

  // Subcontractors
  getSubcontractors(): Subcontractor[];
  getSubcontractor(id: number): Subcontractor | undefined;
  createSubcontractor(data: InsertSubcontractor): Subcontractor;
  updateSubcontractor(id: number, data: Partial<InsertSubcontractor>): Subcontractor | undefined;
  deleteSubcontractor(id: number): boolean;

  // Subcontractor Assignments
  getAssignmentsByJob(jobId: number): SubcontractorAssignment[];
  createAssignment(data: InsertSubcontractorAssignment): SubcontractorAssignment;
  updateAssignment(id: number, data: Partial<InsertSubcontractorAssignment>): SubcontractorAssignment | undefined;
  deleteAssignment(id: number): boolean;

  // Documents
  getDocuments(): DocRecord[];
  getDocumentsByLead(leadId: number): DocRecord[];
  getDocumentsByJob(jobId: number): DocRecord[];
  createDocument(data: InsertDocument): DocRecord;
  deleteDocument(id: number): boolean;

  // Referral Sources
  getReferralSources(): ReferralSource[];
  getReferralSource(id: number): ReferralSource | undefined;
  createReferralSource(data: InsertReferralSource): ReferralSource;
  updateReferralSource(id: number, data: Partial<InsertReferralSource>): ReferralSource | undefined;
  deleteReferralSource(id: number): boolean;

  // Commissions
  getCommissions(): Commission[];
  getCommissionsByLead(leadId: number): Commission[];
  getCommissionsBySalesRep(salesRep: string): Commission[];
  createCommission(data: InsertCommission): Commission;
  updateCommission(id: number, data: Partial<InsertCommission>): Commission | undefined;
  deleteCommission(id: number): boolean;
}

export const storage: IStorage = {
  // ─── LEADS ───────────────────────────────────────────────────────────────
  getLeads() { return db.select().from(leads).orderBy(desc(leads.createdAt)).all(); },
  getLead(id) { return db.select().from(leads).where(eq(leads.id, id)).get(); },
  createLead(data) {
    return db.insert(leads).values({ ...data, createdAt: now(), updatedAt: now() }).returning().get();
  },
  updateLead(id, data) {
    return db.update(leads).set({ ...data, updatedAt: now() }).where(eq(leads.id, id)).returning().get();
  },
  deleteLead(id) {
    const r = db.delete(leads).where(eq(leads.id, id)).run();
    return r.changes > 0;
  },
  searchLeads(query) {
    const q = `%${query}%`;
    return db.select().from(leads).where(
      or(like(leads.firstName, q), like(leads.lastName, q), like(leads.email, q), like(leads.phone, q), like(leads.address, q))
    ).all();
  },
  getLeadsByZip(zips) {
    if (!zips.length) return [];
    return db.select().from(leads).where(inArray(leads.zip, zips)).all();
  },

  // ─── JOBS ────────────────────────────────────────────────────────────────
  getJobs() { return db.select().from(jobs).orderBy(desc(jobs.createdAt)).all(); },
  getJob(id) { return db.select().from(jobs).where(eq(jobs.id, id)).get(); },
  getJobsByLead(leadId) { return db.select().from(jobs).where(eq(jobs.leadId, leadId)).all(); },
  createJob(data) {
    return db.insert(jobs).values({
      ...data, jobNumber: jobNum(), createdAt: now(), updatedAt: now()
    }).returning().get();
  },
  updateJob(id, data) {
    return db.update(jobs).set({ ...data, updatedAt: now() }).where(eq(jobs.id, id)).returning().get();
  },

  // ─── ESTIMATES ───────────────────────────────────────────────────────────
  getEstimates() { return db.select().from(estimates).orderBy(desc(estimates.createdAt)).all(); },
  getEstimate(id) { return db.select().from(estimates).where(eq(estimates.id, id)).get(); },
  getEstimatesByLead(leadId) { return db.select().from(estimates).where(eq(estimates.leadId, leadId)).all(); },
  createEstimate(data) {
    return db.insert(estimates).values({
      ...data, estimateNumber: estNum(), createdAt: now(), updatedAt: now()
    }).returning().get();
  },
  updateEstimate(id, data) {
    return db.update(estimates).set({ ...data, updatedAt: now() }).where(eq(estimates.id, id)).returning().get();
  },

  // ─── STORM ALERTS ────────────────────────────────────────────────────────
  getStormAlerts() { return db.select().from(stormAlerts).orderBy(desc(stormAlerts.createdAt)).all(); },
  getStormAlert(id) { return db.select().from(stormAlerts).where(eq(stormAlerts.id, id)).get(); },
  createStormAlert(data) {
    return db.insert(stormAlerts).values({ ...data, createdAt: now() }).returning().get();
  },
  updateStormAlert(id, data) {
    return db.update(stormAlerts).set(data).where(eq(stormAlerts.id, id)).returning().get();
  },

  // ─── PROJECTS ────────────────────────────────────────────────────────────
  getProjects() { return db.select().from(projects).orderBy(desc(projects.createdAt)).all(); },
  getProject(id) { return db.select().from(projects).where(eq(projects.id, id)).get(); },
  createProject(data) {
    return db.insert(projects).values({ ...data, createdAt: now(), updatedAt: now() }).returning().get();
  },
  updateProject(id, data) {
    return db.update(projects).set({ ...data, updatedAt: now() }).where(eq(projects.id, id)).returning().get();
  },

  // ─── PHOTOS ──────────────────────────────────────────────────────────────
  getPhotosByProject(projectId) { return db.select().from(photos).where(eq(photos.projectId, projectId)).all(); },
  createPhoto(data) {
    return db.insert(photos).values({ ...data, createdAt: now() }).returning().get();
  },
  updatePhoto(id, data) {
    return db.update(photos).set(data).where(eq(photos.id, id)).returning().get();
  },
  deletePhoto(id) {
    const r = db.delete(photos).where(eq(photos.id, id)).run();
    return r.changes > 0;
  },

  // ─── EMAIL LOGS ──────────────────────────────────────────────────────────
  getEmailLogs() { return db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).all(); },
  getEmailLogsByLead(leadId) { return db.select().from(emailLogs).where(eq(emailLogs.leadId, leadId)).all(); },
  createEmailLog(data) {
    return db.insert(emailLogs).values({ ...data, createdAt: now() }).returning().get();
  },
  updateEmailLog(id, data) {
    return db.update(emailLogs).set(data).where(eq(emailLogs.id, id)).returning().get();
  },

  // ─── MEASUREMENTS ─────────────────────────────────────────────────────────
  getMeasurements() { return db.select().from(measurements).orderBy(desc(measurements.createdAt)).all(); },
  getMeasurement(id) { return db.select().from(measurements).where(eq(measurements.id, id)).get(); },
  createMeasurement(data) {
    return db.insert(measurements).values({ ...data, createdAt: now() }).returning().get();
  },
  updateMeasurement(id, data) {
    return db.update(measurements).set(data).where(eq(measurements.id, id)).returning().get();
  },
  deleteMeasurement(id) {
    const r = db.delete(measurements).where(eq(measurements.id, id)).run();
    return r.changes > 0;
  },
  findLeadByAddress(address) {
    if (!address) return undefined;
    const normalized = address.toLowerCase().replace(/[,]/g, '').trim();
    const parts = normalized.split(/\s+/);
    if (parts.length < 2) return undefined;
    const streetNum = parts[0];
    const streetName = parts[1];
    const q = `%${streetNum}%${streetName}%`;
    return db.select().from(leads).where(like(leads.address, q)).get();
  },
  findLeadByCoords(_lat: number, _lng: number) {
    // Without stored coords on leads, GPS matching falls back to reverse-geocode address matching
    return undefined;
  },

  // ─── SETTINGS ────────────────────────────────────────────────────────────
  getSetting(key) {
    const r = db.select().from(settings).where(eq(settings.key, key)).get();
    return r?.value;
  },
  setSetting(key, value) {
    const existing = db.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) {
      db.update(settings).set({ value, updatedAt: now() }).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({ key, value, updatedAt: now() }).run();
    }
  },
  getAllSettings() { return db.select().from(settings).all(); },

  // ── Insurance Claims ──
  getInsuranceClaims() {
    return db.select().from(insuranceClaims).orderBy(desc(insuranceClaims.createdAt)).all();
  },
  getInsuranceClaimsByLead(leadId: number) {
    return db.select().from(insuranceClaims).where(eq(insuranceClaims.leadId, leadId)).all();
  },
  getInsuranceClaim(id: number) {
    return db.select().from(insuranceClaims).where(eq(insuranceClaims.id, id)).get();
  },
  createInsuranceClaim(data: InsertInsuranceClaim) {
    const n = now();
    return db.insert(insuranceClaims).values({ ...data, createdAt: n, updatedAt: n }).returning().get();
  },
  updateInsuranceClaim(id: number, data: Partial<InsertInsuranceClaim>) {
    return db.update(insuranceClaims).set({ ...data, updatedAt: now() }).where(eq(insuranceClaims.id, id)).returning().get();
  },
  deleteInsuranceClaim(id: number) {
    const r = db.delete(insuranceClaims).where(eq(insuranceClaims.id, id)).run();
    return r.changes > 0;
  },

  // ── Contracts ──
  getContracts() {
    return db.select().from(contracts).orderBy(desc(contracts.createdAt)).all();
  },
  getContractsByLead(leadId: number) {
    return db.select().from(contracts).where(eq(contracts.leadId, leadId)).all();
  },
  getContract(id: number) {
    return db.select().from(contracts).where(eq(contracts.id, id)).get();
  },
  createContract(data: InsertContract) {
    const n = now();
    return db.insert(contracts).values({ ...data, createdAt: n, updatedAt: n }).returning().get();
  },
  updateContract(id: number, data: Partial<InsertContract>) {
    return db.update(contracts).set({ ...data, updatedAt: now() }).where(eq(contracts.id, id)).returning().get();
  },
  deleteContract(id: number) {
    const r = db.delete(contracts).where(eq(contracts.id, id)).run();
    return r.changes > 0;
  },

  // ── Payments ──
  getPayments() {
    return db.select().from(payments).orderBy(desc(payments.createdAt)).all();
  },
  getPaymentsByJob(jobId: number) {
    return db.select().from(payments).where(eq(payments.jobId, jobId)).all();
  },
  getPaymentsByLead(leadId: number) {
    return db.select().from(payments).where(eq(payments.leadId, leadId)).all();
  },
  createPayment(data: InsertPayment) {
    return db.insert(payments).values({ ...data, createdAt: now() }).returning().get();
  },
  updatePayment(id: number, data: Partial<InsertPayment>) {
    return db.update(payments).set(data).where(eq(payments.id, id)).returning().get();
  },
  deletePayment(id: number) {
    const r = db.delete(payments).where(eq(payments.id, id)).run();
    return r.changes > 0;
  },

  // ── Supplements ──
  getSupplements() {
    return db.select().from(supplements).orderBy(desc(supplements.createdAt)).all();
  },
  getSupplementsByClaim(claimId: number) {
    return db.select().from(supplements).where(eq(supplements.claimId, claimId)).all();
  },
  getSupplement(id: number) {
    return db.select().from(supplements).where(eq(supplements.id, id)).get();
  },
  createSupplement(data: InsertSupplement) {
    const n = now();
    return db.insert(supplements).values({ ...data, createdAt: n, updatedAt: n }).returning().get();
  },
  updateSupplement(id: number, data: Partial<InsertSupplement>) {
    return db.update(supplements).set({ ...data, updatedAt: now() }).where(eq(supplements.id, id)).returning().get();
  },
  deleteSupplement(id: number) {
    const r = db.delete(supplements).where(eq(supplements.id, id)).run();
    return r.changes > 0;
  },

  // ── Subcontractors ──
  getSubcontractors() {
    return db.select().from(subcontractors).orderBy(desc(subcontractors.createdAt)).all();
  },
  getSubcontractor(id: number) {
    return db.select().from(subcontractors).where(eq(subcontractors.id, id)).get();
  },
  createSubcontractor(data: InsertSubcontractor) {
    return db.insert(subcontractors).values({ ...data, createdAt: now() }).returning().get();
  },
  updateSubcontractor(id: number, data: Partial<InsertSubcontractor>) {
    return db.update(subcontractors).set(data).where(eq(subcontractors.id, id)).returning().get();
  },
  deleteSubcontractor(id: number) {
    const r = db.delete(subcontractors).where(eq(subcontractors.id, id)).run();
    return r.changes > 0;
  },

  // ── Subcontractor Assignments ──
  getAssignmentsByJob(jobId: number) {
    return db.select().from(subcontractorAssignments).where(eq(subcontractorAssignments.jobId, jobId)).all();
  },
  createAssignment(data: InsertSubcontractorAssignment) {
    return db.insert(subcontractorAssignments).values({ ...data, createdAt: now() }).returning().get();
  },
  updateAssignment(id: number, data: Partial<InsertSubcontractorAssignment>) {
    return db.update(subcontractorAssignments).set(data).where(eq(subcontractorAssignments.id, id)).returning().get();
  },
  deleteAssignment(id: number) {
    const r = db.delete(subcontractorAssignments).where(eq(subcontractorAssignments.id, id)).run();
    return r.changes > 0;
  },

  // ── Documents ──
  getDocuments() {
    return db.select().from(documents).orderBy(desc(documents.createdAt)).all();
  },
  getDocumentsByLead(leadId: number) {
    return db.select().from(documents).where(eq(documents.leadId, leadId)).all();
  },
  getDocumentsByJob(jobId: number) {
    return db.select().from(documents).where(eq(documents.jobId, jobId)).all();
  },
  createDocument(data: InsertDocument) {
    return db.insert(documents).values({ ...data, createdAt: now() }).returning().get();
  },
  deleteDocument(id: number) {
    const r = db.delete(documents).where(eq(documents.id, id)).run();
    return r.changes > 0;
  },

  // ── Referral Sources ──
  getReferralSources() {
    return db.select().from(referralSources).orderBy(desc(referralSources.createdAt)).all();
  },
  getReferralSource(id: number) {
    return db.select().from(referralSources).where(eq(referralSources.id, id)).get();
  },
  createReferralSource(data: InsertReferralSource) {
    return db.insert(referralSources).values({ ...data, createdAt: now() }).returning().get();
  },
  updateReferralSource(id: number, data: Partial<InsertReferralSource>) {
    return db.update(referralSources).set(data).where(eq(referralSources.id, id)).returning().get();
  },
  deleteReferralSource(id: number) {
    const r = db.delete(referralSources).where(eq(referralSources.id, id)).run();
    return r.changes > 0;
  },

  // ── Commissions ──
  getCommissions() {
    return db.select().from(commissions).orderBy(desc(commissions.createdAt)).all();
  },
  getCommissionsByLead(leadId: number) {
    return db.select().from(commissions).where(eq(commissions.leadId, leadId)).all();
  },
  getCommissionsBySalesRep(salesRep: string) {
    return db.select().from(commissions).where(eq(commissions.salesRep, salesRep)).all();
  },
  createCommission(data: InsertCommission) {
    const n = now();
    return db.insert(commissions).values({ ...data, createdAt: n, updatedAt: n }).returning().get();
  },
  updateCommission(id: number, data: Partial<InsertCommission>) {
    return db.update(commissions).set({ ...data, updatedAt: now() }).where(eq(commissions.id, id)).returning().get();
  },
  deleteCommission(id: number) {
    const r = db.delete(commissions).where(eq(commissions.id, id)).run();
    return r.changes > 0;
  },
};
