# CW Roofing Pro

Company workspace for CW Roofing & Construction: CRM, jobs, estimates, measurements, claims, contracts, payments, subcontractors, documents, photos, referrals, and commissions.

The React/TypeScript frontend and Express API now use Supabase PostgreSQL, Supabase Auth, and private Supabase Storage. Records persist independently of the app host. The app requires a signed-in user with an active entry in `staff_members`.

## Run

1. Copy `.env.example` to `.env`.
2. Create the first authorized staff account as described in [DEPLOYMENT.md](DEPLOYMENT.md).
3. Run `npm ci` and `npm run dev` with Node 22 or newer.

Build with `npm run check && npm run build`; run production with `npm start`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the already-applied Supabase migration, hosting, staff roles, backup limitations, and verification steps. Do not commit customer records, credentials, or uploaded files to this public repository.

`uploads/` contains historical development sample files, not production records. The running app uses a private bucket and does not serve that directory.
