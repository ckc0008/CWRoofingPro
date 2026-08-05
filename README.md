# CW Roofing Pro

CW Roofing Pro is a custom operating system for a roofing business — lead management, CRM, estimates/quotes, insurance claims, satellite roof measurements, jobs, subcontractors, payments, and more — built as a full-stack TypeScript app (React + Express) and previously deployed at `cwroofingpro.pplx.app`.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Wouter (routing), Recharts, Framer Motion
- **Backend:** Express 5, TypeScript (via `tsx`), Passport (auth), Multer (file uploads)
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **Build:** Vite (client) + esbuild (server), orchestrated by `script/build.ts`

## Project Structure

```
client/            React frontend (pages, components, hooks)
  src/pages/       Dashboard, CRM, Jobs, Estimates, Measurements, InsuranceClaims,
                    Contracts, Payments, Commissions, Subcontractors, Supplements,
                    MaterialOrders, PhotoProjects, Documents, EmailCenter,
                    StormAlerts, Referrals, EstimatePortal, ProjectDetail, LeadDetail
server/            Express API server (routes, storage/DB layer, Vite dev middleware)
shared/            Shared Drizzle schema/types used by both client and server
script/build.ts    Production build script (Vite client build + esbuild server bundle)
attached_assets/   Brand assets (logo)
dist/              Production build output (client bundle + server bundle) — included
                    here as a snapshot of the last build; regenerate with `npm run build`
uploads/           Sample uploaded documents used during development/testing
```

## Setup

```bash
npm install
npm run dev      # start local dev server (client + API)
npm run build    # production build -> dist/
npm run start    # run the production build (dist/index.cjs)
npm run db:push  # push the Drizzle schema to the SQLite database
```

The app uses a local SQLite database file (`data.db`) created at runtime in the project root (see `server/storage.ts`); it is not checked into this repo and will be created automatically the first time the server runs. Run `npm run db:push` after install to apply the schema.

## Notes

- `uploads/` contains sample PDF/XML files used to test document and measurement-report import flows during development.
- `dist/` is the last production build snapshot; since `data.db` is generated at runtime it is intentionally excluded from version control.
