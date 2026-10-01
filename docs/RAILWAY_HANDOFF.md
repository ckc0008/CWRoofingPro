# Railway Deployment Handoff — CW Roofing Pro

Current production-ready main includes RoofScan and Railway wiring.

## Create one Railway project

Project name: `CW Roofing Pro Production`

Use one environment: `production`.

## Shared secret

Create a shared variable named `ROOFSCAN_API_TOKEN` with a cryptographically random secret (64 hex chars or equivalent). Share it with both services. Do not hardcode it in GitHub.

## Service 1 — cw-roofing-pro

- Source: GitHub `ckc0008/CWRoofingPro`
- Branch: `main`
- Root directory: `/`
- Dockerfile: `/Dockerfile` (auto-detected)
- Public networking: generate Railway domain
- Healthcheck path: `/api/health`
- Persistent volume: mount at `/data`
- Restart policy: On Failure

Variables:
```
DATABASE_PATH=/data/data.db
UPLOADS_DIR=/data/uploads
GOOGLE_MAPS_API_KEY=<CW Google Maps/Geocoding key>
ROOFSCAN_WORKER_URL=http://${{roofscan-worker.RAILWAY_PRIVATE_DOMAIN}}:${{roofscan-worker.PORT}}
ROOFSCAN_WORKER_TOKEN=${{shared.ROOFSCAN_API_TOKEN}}
```

Optional commercial fallback:
```
ARTEMIS_API_URL=
ARTEMIS_API_KEY=
```

## Service 2 — roofscan-worker

- Source: same GitHub repo `ckc0008/CWRoofingPro`
- Branch: `main`
- Root directory: `/roofscan-worker`
- Dockerfile: `/roofscan-worker/Dockerfile` (auto-detected from root directory)
- Public networking: none required
- Healthcheck path: `/health`
- Restart policy: On Failure

Variables:
```
ROOFSCAN_API_TOKEN=${{shared.ROOFSCAN_API_TOKEN}}
ROOFSCAN_ENABLE_LIDAR_PROTOTYPE=true
OVERTURE_RELEASE=2026-09-23.1
ROOFSCAN_LIDAR_CACHE=/tmp/roofscan-lidar
```

## Deployment order

1. Create project/environment/shared secret.
2. Create and deploy `roofscan-worker`.
3. Verify worker deployment is healthy.
4. Create `cw-roofing-pro`, attach `/data` volume, set variables.
5. Generate public domain for CRM and deploy.
6. Verify `GET /api/health` on the CRM public domain returns `ok: true`.
7. Open CRM Measurements and run **RoofScan Lab** on a known Houston-area property.
8. Confirm Overture building footprint + USGS 3DEP LiDAR discovery.
9. Compare prototype dimensions to a known field/EagleView/Nearmap report before treating them as trusted.

## Important safety gate

The CW open-data worker intentionally returns `prototype`, not `verified`, until real-roof benchmark acceptance is met. Prototype results display in RoofScan Lab and are not saved into customer estimates.

## Current verification

The repository currently passes:

- production `npm audit --omit=dev`
- TypeScript compile
- Python geometry tests
- CRM Docker image build
- RoofScan worker Docker image build

## Next development after deployment

- run real-roof Houston diagnostics
- improve facet polygon reconstruction and overhang correction
- add interactive aerial/wireframe editor
- build benchmark set of verified roofs
- enable `status: verified` only after accuracy targets are consistently met
