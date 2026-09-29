import { randomUUID } from "node:crypto";
import { getTableColumns, getTableName } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import type { PgTable } from "drizzle-orm/pg-core";
import type { z } from "zod";
import * as schema from "@shared/schema";
import { requestDatabase } from "./supabase";
import { signStoredFile } from "./files";
import {
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

export interface IStorage {
  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(data: InsertLead): Promise<Lead>;
  updateLead(id: number, data: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  searchLeads(query: string): Promise<Lead[]>;
  getLeadsByZip(zips: string[]): Promise<Lead[]>;

  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  getJobsByLead(leadId: number): Promise<Job[]>;
  createJob(data: InsertJob): Promise<Job>;
  updateJob(id: number, data: Partial<InsertJob>): Promise<Job | undefined>;

  // Estimates
  getEstimates(): Promise<Estimate[]>;
  getEstimate(id: number): Promise<Estimate | undefined>;
  getEstimatesByLead(leadId: number): Promise<Estimate[]>;
  createEstimate(data: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: number, data: Partial<InsertEstimate>): Promise<Estimate | undefined>;

  // Storm Alerts
  getStormAlerts(): Promise<StormAlert[]>;
  getStormAlert(id: number): Promise<StormAlert | undefined>;
  createStormAlert(data: InsertStormAlert): Promise<StormAlert>;
  updateStormAlert(id: number, data: Partial<InsertStormAlert>): Promise<StormAlert | undefined>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;

  // Photos
  getPhotosByProject(projectId: number): Promise<Photo[]>;
  createPhoto(data: InsertPhoto): Promise<Photo>;
  updatePhoto(id: number, data: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: number): Promise<boolean>;

  // Email Logs
  getEmailLogs(): Promise<EmailLog[]>;
  getEmailLogsByLead(leadId: number): Promise<EmailLog[]>;
  createEmailLog(data: InsertEmailLog): Promise<EmailLog>;
  updateEmailLog(id: number, data: Partial<InsertEmailLog>): Promise<EmailLog | undefined>;

  // Measurements
  getMeasurements(): Promise<Measurement[]>;
  getMeasurement(id: number): Promise<Measurement | undefined>;
  createMeasurement(data: InsertMeasurement): Promise<Measurement>;
  updateMeasurement(id: number, data: Partial<InsertMeasurement>): Promise<Measurement | undefined>;
  deleteMeasurement(id: number): Promise<boolean>;
  findLeadByAddress(address: string): Promise<Lead | undefined>;
  findLeadByCoords(lat: number, lng: number): Promise<Lead | undefined>;

  // Settings
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<Setting[]>;

  // Insurance Claims
  getInsuranceClaims(): Promise<InsuranceClaim[]>;
  getInsuranceClaimsByLead(leadId: number): Promise<InsuranceClaim[]>;
  getInsuranceClaim(id: number): Promise<InsuranceClaim | undefined>;
  createInsuranceClaim(data: InsertInsuranceClaim): Promise<InsuranceClaim>;
  updateInsuranceClaim(id: number, data: Partial<InsertInsuranceClaim>): Promise<InsuranceClaim | undefined>;
  deleteInsuranceClaim(id: number): Promise<boolean>;

  // Contracts
  getContracts(): Promise<Contract[]>;
  getContractsByLead(leadId: number): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  createContract(data: InsertContract): Promise<Contract>;
  updateContract(id: number, data: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<boolean>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPaymentsByJob(jobId: number): Promise<Payment[]>;
  getPaymentsByLead(leadId: number): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;
  updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;

  // Supplements
  getSupplements(): Promise<Supplement[]>;
  getSupplementsByClaim(claimId: number): Promise<Supplement[]>;
  getSupplement(id: number): Promise<Supplement | undefined>;
  createSupplement(data: InsertSupplement): Promise<Supplement>;
  updateSupplement(id: number, data: Partial<InsertSupplement>): Promise<Supplement | undefined>;
  deleteSupplement(id: number): Promise<boolean>;

  // Subcontractors
  getSubcontractors(): Promise<Subcontractor[]>;
  getSubcontractor(id: number): Promise<Subcontractor | undefined>;
  createSubcontractor(data: InsertSubcontractor): Promise<Subcontractor>;
  updateSubcontractor(id: number, data: Partial<InsertSubcontractor>): Promise<Subcontractor | undefined>;
  deleteSubcontractor(id: number): Promise<boolean>;

  // Subcontractor Assignments
  getAssignmentsByJob(jobId: number): Promise<SubcontractorAssignment[]>;
  createAssignment(data: InsertSubcontractorAssignment): Promise<SubcontractorAssignment>;
  updateAssignment(id: number, data: Partial<InsertSubcontractorAssignment>): Promise<SubcontractorAssignment | undefined>;
  deleteAssignment(id: number): Promise<boolean>;

  // Documents
  getDocuments(): Promise<DocRecord[]>;
  getDocumentsByLead(leadId: number): Promise<DocRecord[]>;
  getDocumentsByJob(jobId: number): Promise<DocRecord[]>;
  createDocument(data: InsertDocument): Promise<DocRecord>;
  deleteDocument(id: number): Promise<boolean>;

  // Referral Sources
  getReferralSources(): Promise<ReferralSource[]>;
  getReferralSource(id: number): Promise<ReferralSource | undefined>;
  createReferralSource(data: InsertReferralSource): Promise<ReferralSource>;
  updateReferralSource(id: number, data: Partial<InsertReferralSource>): Promise<ReferralSource | undefined>;
  deleteReferralSource(id: number): Promise<boolean>;

  // Commissions
  getCommissions(): Promise<Commission[]>;
  getCommissionsByLead(leadId: number): Promise<Commission[]>;
  getCommissionsBySalesRep(salesRep: string): Promise<Commission[]>;
  createCommission(data: InsertCommission): Promise<Commission>;
  updateCommission(id: number, data: Partial<InsertCommission>): Promise<Commission | undefined>;
  deleteCommission(id: number): Promise<boolean>;
}


function now() { return new Date().toISOString(); }
function number(prefix: string) { return `${prefix}-${randomUUID()}`; }

function entity(table: PgTable) {
  const tableName = getTableName(table);
  const columns = getTableColumns(table);
  const columnMap = Object.fromEntries(Object.entries(columns).map(([key, col]) => [key, col.name]));
  const reverse = Object.fromEntries(Object.entries(columnMap).map(([key, name]) => [name, key]));
  const insert = createInsertSchema(table) as unknown as z.AnyZodObject;
  const encode = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data)
    .filter(([key, value]) => key in columnMap && key !== "id" && value !== undefined)
    .map(([key, value]) => [columnMap[key], value]));
  async function decode(row: Record<string, unknown>): Promise<any> {
    const result = Object.fromEntries(Object.entries(row).map(([key, value]) => [reverse[key] || key, value]));
    if ((tableName === "photos" || tableName === "documents") && result.url) {
      result.url = await signStoredFile(String(result.url));
    }
    return result;
  }
  return {
    async list(filter?: [string, unknown], order = true) {
      const rows: any[] = [];
      // PostgREST caps a single response. Page explicitly so records do not disappear after 1,000.
      for (let offset = 0; ; offset += 500) {
        let query = requestDatabase().from(tableName).select("*");
        if (filter) query = query.eq(columnMap[filter[0]], filter[1]);
        if (order && columnMap.createdAt) query = query.order("created_at", { ascending: false });
        query = query.order("id", { ascending: false }).range(offset, offset + 499);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...await Promise.all((data || []).map(decode)));
        if (!data || data.length < 500) break;
      }
      return rows;
    },
    async get(id: number) {
      const { data, error } = await requestDatabase().from(tableName).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? decode(data) : undefined;
    },
    async create(input: Record<string, unknown>) {
      const safe = insert.parse(input);
      const values = { ...safe, ...(columnMap.createdAt ? { createdAt: now() } : {}), ...(columnMap.updatedAt ? { updatedAt: now() } : {}) };
      const { data, error } = await requestDatabase().from(tableName).insert(encode(values)).select().single();
      if (error) throw error;
      return decode(data);
    },
    async update(id: number, input: Record<string, unknown>) {
      const safe = insert.partial().parse(input);
      delete safe.createdAt;
      const values = { ...safe, ...(columnMap.updatedAt ? { updatedAt: now() } : {}) };
      const { data, error } = await requestDatabase().from(tableName).update(encode(values)).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return data ? decode(data) : undefined;
    },
    async remove(id: number) {
      const { data, error } = await requestDatabase().from(tableName).delete().eq("id", id).select("id");
      if (error) throw error;
      return !!data?.length;
    },
  };
}

const leadsStore = entity(schema.leads);
const jobsStore = entity(schema.jobs);
const estimatesStore = entity(schema.estimates);
const stormAlertsStore = entity(schema.stormAlerts);
const projectsStore = entity(schema.projects);
const photosStore = entity(schema.photos);
const emailLogsStore = entity(schema.emailLogs);
const measurementsStore = entity(schema.measurements);
const settingsStore = entity(schema.settings);
const insuranceClaimsStore = entity(schema.insuranceClaims);
const contractsStore = entity(schema.contracts);
const paymentsStore = entity(schema.payments);
const supplementsStore = entity(schema.supplements);
const subcontractorsStore = entity(schema.subcontractors);
const subcontractorAssignmentsStore = entity(schema.subcontractorAssignments);
const documentsStore = entity(schema.documents);
const referralSourcesStore = entity(schema.referralSources);
const commissionsStore = entity(schema.commissions);

export const storage: IStorage = {
  async getLeads() { return leadsStore.list(); },
  async getLead(id) { return leadsStore.get(id); },
  async createLead(data) { return leadsStore.create(data); },
  async updateLead(id, data) { return leadsStore.update(id, data); },
  async deleteLead(id) { return leadsStore.remove(id); },
  async searchLeads(query) { const q = query.toLowerCase(); return (await storage.getLeads()).filter(l => [l.firstName, l.lastName, l.email, l.phone, l.address].some(v => v.toLowerCase().includes(q))); },
  async getLeadsByZip(zips) { return (await storage.getLeads()).filter(l => zips.includes(l.zip)); },
  async getJobs() { return jobsStore.list(); },
  async getJob(id) { return jobsStore.get(id); },
  async getJobsByLead(leadId) { return jobsStore.list(["leadId", leadId]); },
  async createJob(data) { return jobsStore.create({ ...data, jobNumber: number("JOB") }); },
  async updateJob(id, data) { return jobsStore.update(id, data); },
  async getEstimates() { return estimatesStore.list(); },
  async getEstimate(id) { return estimatesStore.get(id); },
  async getEstimatesByLead(leadId) { return estimatesStore.list(["leadId", leadId]); },
  async createEstimate(data) { return estimatesStore.create({ ...data, estimateNumber: number("EST") }); },
  async updateEstimate(id, data) { return estimatesStore.update(id, data); },
  async getStormAlerts() { return stormAlertsStore.list(); },
  async getStormAlert(id) { return stormAlertsStore.get(id); },
  async createStormAlert(data) { return stormAlertsStore.create(data); },
  async updateStormAlert(id, data) { return stormAlertsStore.update(id, data); },
  async getProjects() { return projectsStore.list(); },
  async getProject(id) { return projectsStore.get(id); },
  async createProject(data) { return projectsStore.create(data); },
  async updateProject(id, data) { return projectsStore.update(id, data); },
  async getPhotosByProject(projectId) { return photosStore.list(["projectId", projectId]); },
  async createPhoto(data) { return photosStore.create(data); },
  async updatePhoto(id, data) { return photosStore.update(id, data); },
  async deletePhoto(id) { return photosStore.remove(id); },
  async getEmailLogs() { return emailLogsStore.list(); },
  async getEmailLogsByLead(leadId) { return emailLogsStore.list(["leadId", leadId]); },
  async createEmailLog(data) { return emailLogsStore.create(data); },
  async updateEmailLog(id, data) { return emailLogsStore.update(id, data); },
  async getMeasurements() { return measurementsStore.list(); },
  async getMeasurement(id) { return measurementsStore.get(id); },
  async createMeasurement(data) { return measurementsStore.create(data); },
  async updateMeasurement(id, data) { return measurementsStore.update(id, data); },
  async deleteMeasurement(id) { return measurementsStore.remove(id); },
  async findLeadByAddress(address) { const normalized = address.toLowerCase().replace(/,/g, "").trim(); if (!normalized) return undefined; return (await storage.getLeads()).find(l => l.address.toLowerCase().replace(/,/g, "").trim() === normalized); },
  async findLeadByCoords(_lat: number, _lng: number) { return undefined; },
  async getSetting(key) { if (key.endsWith("_api_key")) return process.env[key.toUpperCase()]; const rows = await settingsStore.list(["key", key]); return rows[0]?.value; },
  async setSetting(key, value) { if (key.endsWith("_api_key")) throw new Error("Configure integration API keys in hosting environment variables."); const { error } = await requestDatabase().from("settings").upsert({ key, value, updated_at: now() }, { onConflict: "key" }); if (error) throw error; },
  async getAllSettings() { return settingsStore.list(); },
  async getInsuranceClaims() { return insuranceClaimsStore.list(); },
  async getInsuranceClaimsByLead(leadId: number) { return insuranceClaimsStore.list(["leadId", leadId]); },
  async getInsuranceClaim(id: number) { return insuranceClaimsStore.get(id); },
  async createInsuranceClaim(data: InsertInsuranceClaim) { return insuranceClaimsStore.create(data); },
  async updateInsuranceClaim(id: number, data: Partial<InsertInsuranceClaim>) { return insuranceClaimsStore.update(id, data); },
  async deleteInsuranceClaim(id: number) { return insuranceClaimsStore.remove(id); },
  async getContracts() { return contractsStore.list(); },
  async getContractsByLead(leadId: number) { return contractsStore.list(["leadId", leadId]); },
  async getContract(id: number) { return contractsStore.get(id); },
  async createContract(data: InsertContract) { return contractsStore.create(data); },
  async updateContract(id: number, data: Partial<InsertContract>) { return contractsStore.update(id, data); },
  async deleteContract(id: number) { return contractsStore.remove(id); },
  async getPayments() { return paymentsStore.list(); },
  async getPaymentsByJob(jobId: number) { return paymentsStore.list(["jobId", jobId]); },
  async getPaymentsByLead(leadId: number) { return paymentsStore.list(["leadId", leadId]); },
  async createPayment(data: InsertPayment) { return paymentsStore.create(data); },
  async updatePayment(id: number, data: Partial<InsertPayment>) { return paymentsStore.update(id, data); },
  async deletePayment(id: number) { return paymentsStore.remove(id); },
  async getSupplements() { return supplementsStore.list(); },
  async getSupplementsByClaim(claimId: number) { return supplementsStore.list(["claimId", claimId]); },
  async getSupplement(id: number) { return supplementsStore.get(id); },
  async createSupplement(data: InsertSupplement) { return supplementsStore.create(data); },
  async updateSupplement(id: number, data: Partial<InsertSupplement>) { return supplementsStore.update(id, data); },
  async deleteSupplement(id: number) { return supplementsStore.remove(id); },
  async getSubcontractors() { return subcontractorsStore.list(); },
  async getSubcontractor(id: number) { return subcontractorsStore.get(id); },
  async createSubcontractor(data: InsertSubcontractor) { return subcontractorsStore.create(data); },
  async updateSubcontractor(id: number, data: Partial<InsertSubcontractor>) { return subcontractorsStore.update(id, data); },
  async deleteSubcontractor(id: number) { return subcontractorsStore.remove(id); },
  async getAssignmentsByJob(jobId: number) { return subcontractorAssignmentsStore.list(["jobId", jobId]); },
  async createAssignment(data: InsertSubcontractorAssignment) { return subcontractorAssignmentsStore.create(data); },
  async updateAssignment(id: number, data: Partial<InsertSubcontractorAssignment>) { return subcontractorAssignmentsStore.update(id, data); },
  async deleteAssignment(id: number) { return subcontractorAssignmentsStore.remove(id); },
  async getDocuments() { return documentsStore.list(); },
  async getDocumentsByLead(leadId: number) { return documentsStore.list(["leadId", leadId]); },
  async getDocumentsByJob(jobId: number) { return documentsStore.list(["jobId", jobId]); },
  async createDocument(data: InsertDocument) { return documentsStore.create(data); },
  async deleteDocument(id: number) { return documentsStore.remove(id); },
  async getReferralSources() { return referralSourcesStore.list(); },
  async getReferralSource(id: number) { return referralSourcesStore.get(id); },
  async createReferralSource(data: InsertReferralSource) { return referralSourcesStore.create(data); },
  async updateReferralSource(id: number, data: Partial<InsertReferralSource>) { return referralSourcesStore.update(id, data); },
  async deleteReferralSource(id: number) { return referralSourcesStore.remove(id); },
  async getCommissions() { return commissionsStore.list(); },
  async getCommissionsByLead(leadId: number) { return commissionsStore.list(["leadId", leadId]); },
  async getCommissionsBySalesRep(salesRep: string) { return commissionsStore.list(["salesRep", salesRep]); },
  async createCommission(data: InsertCommission) { return commissionsStore.create(data); },
  async updateCommission(id: number, data: Partial<InsertCommission>) { return commissionsStore.update(id, data); },
  async deleteCommission(id: number) { return commissionsStore.remove(id); },
};
