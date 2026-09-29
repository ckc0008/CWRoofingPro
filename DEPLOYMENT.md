# CW Roofing Pro deployment

## Provisioned database

Supabase project: `bydrecvgwkayqauxbwnq` (CW Roofing Pro).
The migration in `supabase/migrations/` has been applied to this project. Do not apply it again there.
It defines 18 business tables, staff membership, foreign keys, indexes, row-level security, and the private `cw-company-files` bucket. There are no customer records.

Runtime uses Supabase's Data API with each verified user's access token. No database password or service-role key is needed by the app. Every company table is limited to active staff members. Administrators and staff can edit business records; viewers can read. Only administrators can edit company settings. Membership cannot be changed from the public API.

## Activate the first administrator

1. In Supabase Authentication > Users, create your own user with an email and password you control. This is separate from your Supabase dashboard login. Do not send the password to an assistant or put it in Git.
2. Copy the new user's UUID and run this SQL in the Supabase SQL editor, replacing the placeholder:

```sql
insert into public.staff_members (user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid, 'admin');
```

Additional employees use the same process with `staff` or `viewer`. To revoke access, set `active = false`; the app and table policies check current membership on every request. Already-issued signed file URLs remain valid for up to one hour.

## Host the app

A Dockerfile is included for a Node-compatible host. Render can import the repository using `render.yaml`; choose the service plan during setup. Hosting account connection and service creation have not been performed.

Required runtime variables (public configuration, not secrets) are in `.env.example`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `PORT` (host may set this automatically)

Optional integrations use server-only secret variables: `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `ARTEMIS_API_KEY`. Do not save them in the settings table. Restrict Google browser keys to the deployed domain.

Build: `npm ci && npm run check && npm run build`.
Start: `npm start`.
Health check: `/healthz`.
Use Node 22 or newer. The API, sign-in configuration, and frontend are served from one origin.

## Verify after deployment

- `/api/leads` returns HTTP 401 without a session.
- Your approved account can sign in, create a lead, save an estimate and job, upload a file, and retrieve those records after a restart.
- A signed-in account without staff membership is denied.
- A viewer can read but cannot change records.
- Sign out removes cached company records from the browser UI.

The database security checks were executed in a rollback-only transaction, including staff writes, viewer read-only access, outsider denial, admin-only settings, and blocked membership escalation. A real-user sign-in and upload round trip still requires the first staff account.

## Backups and recovery

Use a Supabase plan with the backup retention you require and verify those settings in the dashboard. This repository does not enable or purchase a backup plan.

`npm run db:backup -- /private/new-directory` exports business tables and referenced file objects with SHA-256 checksums. It requires `SUPABASE_ACCESS_TOKEN` for a current administrator session, plus the usual public configuration. Stop edits while exporting: this is a paged logical export, not a transactionally consistent snapshot. It does not include authentication users or the complete staff roster, and does not replace a managed Postgres backup. Files need separate backup because database backups do not contain Storage object bytes.

Before relying on recovery, test a database restore and file restoration in a separate Supabase project. No full restore drill has been performed yet. The legacy `db:backup:sqlite` script is retained only for old SQLite exports.

## Existing feature limits

- Email Center logs pending messages; it does not send email until a mail provider is implemented.
- Customer estimate links currently require staff sign-in. A separately scoped customer-sharing flow is needed before sending these to homeowners.
- Material Orders currently calculates printable material sheets; it does not maintain a purchasing ledger.
- Measurement providers and AI analysis need their integration credentials. Automatic background photo analysis was replaced with the existing explicit Analyze action so requests do not report background work as complete.
