-- One CW company workspace. Membership is managed only by the database administrator.
create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','staff','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;
grant select on public.staff_members to authenticated;
create policy staff_members_read_self on public.staff_members for select to authenticated
using (user_id = (select auth.uid()));



create table public.leads (
  id integer generated always as identity primary key,
  first_name text not null,
  last_name text not null,
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default 'TX',
  zip text not null default '',
  source text not null default 'manual',
  status text not null default 'new',
  notes text,
  assigned_to text,
  roof_age integer,
  roof_type text,
  insurance_claim boolean default false,
  insurance_company text,
  claim_number text,
  follow_up_date text,
  created_at text not null default '',
  updated_at text not null default ''
);

create table public.jobs (
  id integer generated always as identity primary key,
  lead_id integer not null,
  job_number text not null,
  status text not null default 'inspection',
  job_type text not null default 'roof-replacement',
  scheduled_date text,
  completed_date text,
  total_amount numeric(14,2) default 0,
  deposit_amount numeric(14,2) default 0,
  deposit_paid boolean default false,
  material_brand text,
  material_color text,
  warranty_years integer,
  crew_lead text,
  notes text,
  created_at text not null default '',
  updated_at text not null default ''
);

create table public.estimates (
  id integer generated always as identity primary key,
  lead_id integer not null,
  job_id integer,
  estimate_number text not null,
  status text not null default 'draft',
  roof_squares double precision default 0,
  roof_pitch text default '6/12',
  roof_type text default 'asphalt-shingle',
  labor_cost numeric(14,2) default 0,
  material_cost numeric(14,2) default 0,
  tear_off_cost numeric(14,2) default 0,
  dumpster_cost numeric(14,2) default 0,
  permit_cost numeric(14,2) default 0,
  gutter_cost numeric(14,2) default 0,
  misc_cost numeric(14,2) default 0,
  subtotal numeric(14,2) default 0,
  tax_rate numeric(14,6) default 0.0825,
  tax_amount numeric(14,2) default 0,
  total_amount numeric(14,2) default 0,
  measurement_method text default 'satellite',
  measurement_data text,
  address_lat double precision,
  address_lng double precision,
  notes text,
  valid_until text,
  sent_at text,
  viewed_at text,
  approved_at text,
  created_at text not null default '',
  updated_at text not null default ''
);

create table public.storm_alerts (
  id integer generated always as identity primary key,
  event_date text not null,
  storm_type text not null,
  severity text not null default 'moderate',
  max_hail_size double precision,
  max_wind_speed double precision,
  affected_zips text not null,
  affected_leads text,
  leads_notified boolean default false,
  source text default 'noaa',
  description text,
  created_at text not null default ''
);

create table public.projects (
  id integer generated always as identity primary key,
  lead_id integer,
  job_id integer,
  name text not null,
  address text not null,
  status text not null default 'active',
  type text not null default 'inspection',
  notes text,
  created_at text not null default '',
  updated_at text not null default ''
);

create table public.photos (
  id integer generated always as identity primary key,
  project_id integer not null,
  filename text not null,
  original_name text not null,
  mime_type text not null,
  size integer not null,
  url text not null,
  tag text default 'general',
  ai_description text,
  ai_damage_level text,
  ai_analyzed boolean default false,
  latitude double precision,
  longitude double precision,
  taken_at text,
  created_at text not null default ''
);

create table public.email_logs (
  id integer generated always as identity primary key,
  lead_id integer not null,
  to_email text not null,
  subject text not null,
  body text not null,
  type text not null,
  status text not null default 'pending',
  sent_at text,
  created_at text not null default ''
);

create table public.measurements (
  id integer generated always as identity primary key,
  address text not null,
  city text,
  state text,
  zip text,
  lat double precision,
  lng double precision,
  squares double precision,
  total_area double precision,
  pitch text,
  facets integer,
  ridge_length double precision,
  valley_length double precision,
  eave_length double precision,
  hip_length double precision,
  rake_length double precision,
  source text default 'satellite',
  raw_data text,
  linked_lead_id integer,
  notes text,
  created_at text not null default ''
);

create table public.settings (
  id integer generated always as identity primary key,
  key text not null unique,
  value text not null,
  updated_at text not null default ''
);

create table public.insurance_claims (
  id integer generated always as identity primary key,
  lead_id integer,
  job_id integer,
  carrier text not null,
  policy_number text,
  claim_number text,
  adjuster_name text,
  adjuster_phone text,
  adjuster_email text,
  date_filed text,
  date_inspection text,
  date_approved text,
  status text not null default 'filed',
  initial_amount numeric(14,2) default 0,
  approved_amount numeric(14,2) default 0,
  mortgage_company text,
  check_endorsement_status text default 'pending',
  notes text,
  created_at text not null default '',
  updated_at text not null default ''
);

create table public.contracts (
  id integer generated always as identity primary key,
  lead_id integer,
  job_id integer,
  estimate_id integer,
  contract_number text not null,
  status text not null default 'draft',
  contract_body text,
  homeowner_name text,
  homeowner_signature text,
  signed_at text,
  sent_at text,
  total_amount numeric(14,2) default 0,
  notes text,
  created_at text not null default '',
  updated_at text not null default ''
);

create table public.payments (
  id integer generated always as identity primary key,
  lead_id integer,
  job_id integer,
  payment_type text not null default 'deposit',
  amount numeric(14,2) not null default 0,
  method text default 'check',
  reference_number text,
  paid_at text,
  notes text,
  created_at text not null default ''
);

create table public.supplements (
  id integer generated always as identity primary key,
  claim_id integer,
  job_id integer,
  supplement_number text not null,
  status text not null default 'draft',
  submitted_at text,
  approved_at text,
  requested_amount numeric(14,2) default 0,
  approved_amount numeric(14,2) default 0,
  line_items text,
  notes text,
  created_at text not null default '',
  updated_at text not null default ''
);

create table public.subcontractors (
  id integer generated always as identity primary key,
  name text not null,
  company text,
  phone text,
  email text,
  trade text default 'roofing',
  rate_type text default 'per_square',
  rate numeric(14,6) default 0,
  notes text,
  active boolean default true,
  created_at text not null default ''
);

create table public.subcontractor_assignments (
  id integer generated always as identity primary key,
  job_id integer not null,
  subcontractor_id integer not null,
  assigned_date text,
  completed_date text,
  agreed_amount numeric(14,2) default 0,
  paid_amount numeric(14,2) default 0,
  paid_at text,
  notes text,
  created_at text not null default ''
);

create table public.documents (
  id integer generated always as identity primary key,
  lead_id integer,
  job_id integer,
  filename text not null,
  original_name text not null,
  mime_type text not null,
  size integer not null,
  url text not null,
  doc_type text default 'other',
  notes text,
  created_at text not null default ''
);

create table public.referral_sources (
  id integer generated always as identity primary key,
  name text not null,
  type text not null default 'referral',
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  active boolean default true,
  created_at text not null default ''
);

create table public.commissions (
  id integer generated always as identity primary key,
  lead_id integer,
  job_id integer,
  sales_rep text not null,
  commission_rate numeric(14,6) default 0.1,
  commission_amount numeric(14,2) default 0,
  status text not null default 'pending',
  paid_at text,
  notes text,
  created_at text not null default '',
  updated_at text not null default ''
);

alter table public.jobs add constraint jobs_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index jobs_lead_id_idx on public.jobs(lead_id);

alter table public.estimates add constraint estimates_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index estimates_lead_id_idx on public.estimates(lead_id);

alter table public.estimates add constraint estimates_job_id_fkey foreign key (job_id) references public.jobs(id);
create index estimates_job_id_idx on public.estimates(job_id);

alter table public.projects add constraint projects_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index projects_lead_id_idx on public.projects(lead_id);

alter table public.projects add constraint projects_job_id_fkey foreign key (job_id) references public.jobs(id);
create index projects_job_id_idx on public.projects(job_id);

alter table public.photos add constraint photos_project_id_fkey foreign key (project_id) references public.projects(id);
create index photos_project_id_idx on public.photos(project_id);

alter table public.email_logs add constraint email_logs_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index email_logs_lead_id_idx on public.email_logs(lead_id);

alter table public.measurements add constraint measurements_linked_lead_id_fkey foreign key (linked_lead_id) references public.leads(id);
create index measurements_linked_lead_id_idx on public.measurements(linked_lead_id);

alter table public.insurance_claims add constraint insurance_claims_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index insurance_claims_lead_id_idx on public.insurance_claims(lead_id);

alter table public.insurance_claims add constraint insurance_claims_job_id_fkey foreign key (job_id) references public.jobs(id);
create index insurance_claims_job_id_idx on public.insurance_claims(job_id);

alter table public.contracts add constraint contracts_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index contracts_lead_id_idx on public.contracts(lead_id);

alter table public.contracts add constraint contracts_job_id_fkey foreign key (job_id) references public.jobs(id);
create index contracts_job_id_idx on public.contracts(job_id);

alter table public.contracts add constraint contracts_estimate_id_fkey foreign key (estimate_id) references public.estimates(id);
create index contracts_estimate_id_idx on public.contracts(estimate_id);

alter table public.payments add constraint payments_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index payments_lead_id_idx on public.payments(lead_id);

alter table public.payments add constraint payments_job_id_fkey foreign key (job_id) references public.jobs(id);
create index payments_job_id_idx on public.payments(job_id);

alter table public.supplements add constraint supplements_claim_id_fkey foreign key (claim_id) references public.insurance_claims(id);
create index supplements_claim_id_idx on public.supplements(claim_id);

alter table public.supplements add constraint supplements_job_id_fkey foreign key (job_id) references public.jobs(id);
create index supplements_job_id_idx on public.supplements(job_id);

alter table public.subcontractor_assignments add constraint subcontractor_assignments_job_id_fkey foreign key (job_id) references public.jobs(id);
create index subcontractor_assignments_job_id_idx on public.subcontractor_assignments(job_id);

alter table public.subcontractor_assignments add constraint subcontractor_assignments_subcontractor_id_fkey foreign key (subcontractor_id) references public.subcontractors(id);
create index subcontractor_assignments_subcontractor_id_idx on public.subcontractor_assignments(subcontractor_id);

alter table public.documents add constraint documents_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index documents_lead_id_idx on public.documents(lead_id);

alter table public.documents add constraint documents_job_id_fkey foreign key (job_id) references public.jobs(id);
create index documents_job_id_idx on public.documents(job_id);

alter table public.commissions add constraint commissions_lead_id_fkey foreign key (lead_id) references public.leads(id);
create index commissions_lead_id_idx on public.commissions(lead_id);

alter table public.commissions add constraint commissions_job_id_fkey foreign key (job_id) references public.jobs(id);
create index commissions_job_id_idx on public.commissions(job_id);


alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant usage, select on sequence public.leads_id_seq to authenticated;
create policy leads_read on public.leads for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy leads_insert on public.leads for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy leads_update on public.leads for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy leads_delete on public.leads for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.jobs enable row level security;
revoke all on public.jobs from anon, authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant usage, select on sequence public.jobs_id_seq to authenticated;
create policy jobs_read on public.jobs for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy jobs_insert on public.jobs for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy jobs_update on public.jobs for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy jobs_delete on public.jobs for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.estimates enable row level security;
revoke all on public.estimates from anon, authenticated;
grant select, insert, update, delete on public.estimates to authenticated;
grant usage, select on sequence public.estimates_id_seq to authenticated;
create policy estimates_read on public.estimates for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy estimates_insert on public.estimates for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy estimates_update on public.estimates for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy estimates_delete on public.estimates for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.storm_alerts enable row level security;
revoke all on public.storm_alerts from anon, authenticated;
grant select, insert, update, delete on public.storm_alerts to authenticated;
grant usage, select on sequence public.storm_alerts_id_seq to authenticated;
create policy storm_alerts_read on public.storm_alerts for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy storm_alerts_insert on public.storm_alerts for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy storm_alerts_update on public.storm_alerts for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy storm_alerts_delete on public.storm_alerts for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant usage, select on sequence public.projects_id_seq to authenticated;
create policy projects_read on public.projects for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy projects_insert on public.projects for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy projects_update on public.projects for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy projects_delete on public.projects for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.photos enable row level security;
revoke all on public.photos from anon, authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant usage, select on sequence public.photos_id_seq to authenticated;
create policy photos_read on public.photos for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy photos_insert on public.photos for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy photos_update on public.photos for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy photos_delete on public.photos for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.email_logs enable row level security;
revoke all on public.email_logs from anon, authenticated;
grant select, insert, update, delete on public.email_logs to authenticated;
grant usage, select on sequence public.email_logs_id_seq to authenticated;
create policy email_logs_read on public.email_logs for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy email_logs_insert on public.email_logs for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy email_logs_update on public.email_logs for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy email_logs_delete on public.email_logs for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.measurements enable row level security;
revoke all on public.measurements from anon, authenticated;
grant select, insert, update, delete on public.measurements to authenticated;
grant usage, select on sequence public.measurements_id_seq to authenticated;
create policy measurements_read on public.measurements for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy measurements_insert on public.measurements for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy measurements_update on public.measurements for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy measurements_delete on public.measurements for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.settings enable row level security;
revoke all on public.settings from anon, authenticated;
grant select, insert, update, delete on public.settings to authenticated;
grant usage, select on sequence public.settings_id_seq to authenticated;
create policy settings_read on public.settings for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy settings_insert on public.settings for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role = 'admin')));
create policy settings_update on public.settings for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role = 'admin'))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role = 'admin')));
create policy settings_delete on public.settings for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role = 'admin')));

alter table public.insurance_claims enable row level security;
revoke all on public.insurance_claims from anon, authenticated;
grant select, insert, update, delete on public.insurance_claims to authenticated;
grant usage, select on sequence public.insurance_claims_id_seq to authenticated;
create policy insurance_claims_read on public.insurance_claims for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy insurance_claims_insert on public.insurance_claims for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy insurance_claims_update on public.insurance_claims for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy insurance_claims_delete on public.insurance_claims for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.contracts enable row level security;
revoke all on public.contracts from anon, authenticated;
grant select, insert, update, delete on public.contracts to authenticated;
grant usage, select on sequence public.contracts_id_seq to authenticated;
create policy contracts_read on public.contracts for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy contracts_insert on public.contracts for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy contracts_update on public.contracts for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy contracts_delete on public.contracts for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant usage, select on sequence public.payments_id_seq to authenticated;
create policy payments_read on public.payments for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy payments_insert on public.payments for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy payments_update on public.payments for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy payments_delete on public.payments for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.supplements enable row level security;
revoke all on public.supplements from anon, authenticated;
grant select, insert, update, delete on public.supplements to authenticated;
grant usage, select on sequence public.supplements_id_seq to authenticated;
create policy supplements_read on public.supplements for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy supplements_insert on public.supplements for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy supplements_update on public.supplements for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy supplements_delete on public.supplements for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.subcontractors enable row level security;
revoke all on public.subcontractors from anon, authenticated;
grant select, insert, update, delete on public.subcontractors to authenticated;
grant usage, select on sequence public.subcontractors_id_seq to authenticated;
create policy subcontractors_read on public.subcontractors for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy subcontractors_insert on public.subcontractors for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy subcontractors_update on public.subcontractors for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy subcontractors_delete on public.subcontractors for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.subcontractor_assignments enable row level security;
revoke all on public.subcontractor_assignments from anon, authenticated;
grant select, insert, update, delete on public.subcontractor_assignments to authenticated;
grant usage, select on sequence public.subcontractor_assignments_id_seq to authenticated;
create policy subcontractor_assignments_read on public.subcontractor_assignments for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy subcontractor_assignments_insert on public.subcontractor_assignments for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy subcontractor_assignments_update on public.subcontractor_assignments for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy subcontractor_assignments_delete on public.subcontractor_assignments for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.documents enable row level security;
revoke all on public.documents from anon, authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant usage, select on sequence public.documents_id_seq to authenticated;
create policy documents_read on public.documents for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy documents_insert on public.documents for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy documents_update on public.documents for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy documents_delete on public.documents for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.referral_sources enable row level security;
revoke all on public.referral_sources from anon, authenticated;
grant select, insert, update, delete on public.referral_sources to authenticated;
grant usage, select on sequence public.referral_sources_id_seq to authenticated;
create policy referral_sources_read on public.referral_sources for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy referral_sources_insert on public.referral_sources for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy referral_sources_update on public.referral_sources for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy referral_sources_delete on public.referral_sources for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.commissions enable row level security;
revoke all on public.commissions from anon, authenticated;
grant select, insert, update, delete on public.commissions to authenticated;
grant usage, select on sequence public.commissions_id_seq to authenticated;
create policy commissions_read on public.commissions for select to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));
create policy commissions_insert on public.commissions for insert to authenticated with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy commissions_update on public.commissions for update to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));
create policy commissions_delete on public.commissions for delete to authenticated using ((select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

alter table public.settings add constraint settings_no_integration_secrets check (key !~* '_api_key$');

insert into public.settings (key,value,updated_at) values
('company_name','CW Roofing & Construction, LLC',now()::text);

insert into storage.buckets (id, name, public, file_size_limit)
values ('cw-company-files', 'cw-company-files', false, 52428800);


create policy cw_files_select on storage.objects for select to authenticated using (bucket_id = 'cw-company-files' and (select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active)));

create policy cw_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'cw-company-files' and (select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

create policy cw_files_update on storage.objects for update to authenticated using (bucket_id = 'cw-company-files' and (select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff')))) with check (bucket_id = 'cw-company-files' and (select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

create policy cw_files_delete on storage.objects for delete to authenticated using (bucket_id = 'cw-company-files' and (select exists (select 1 from public.staff_members where user_id = (select auth.uid()) and active and role in ('admin', 'staff'))));

notify pgrst, 'reload schema';