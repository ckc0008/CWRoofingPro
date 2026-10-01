# CW Roofing Pro + RoofScan — Same-Day Launch

## Production shape

Deploy two services from `ckc0008/CWRoofingPro`:

1. **cw-roofing-pro** — repository root, uses `/Dockerfile`.
2. **cw-roofscan-worker** — root directory `/roofscan-worker`, uses its local `Dockerfile`.

## CRM persistent storage

Attach a persistent volume to the CRM service at `/data`.

The CRM container defaults to:

- `DATABASE_PATH=/data/data.db`
- `UPLOADS_DIR=/data/uploads`

Do not launch the CRM without persistent storage if real customer data will be entered.

## RoofScan worker variables

Set:

- `ROOFSCAN_API_TOKEN=<long random shared secret>`
- `ROOFSCAN_ENABLE_LIDAR_PROTOTYPE=true` for RoofScan Lab testing
- optional `OVERTURE_RELEASE=2026-09-23.1`

The worker reads Railway's `PORT` automatically.

## Connect the CRM to the worker

In CW Roofing Pro → Settings → CW RoofScan Providers:

- CW RoofScan Worker URL = worker service URL/private URL
- CW RoofScan Worker Token = same `ROOFSCAN_API_TOKEN`

Google Maps API key is still needed for address geocoding. It is not used to derive roof geometry.

## Launch verification

1. CRM `/api/health` returns `{ ok: true }`.
2. Worker `/health` returns `{ ok: true }`.
3. Worker `/ready` reports `ready: true`.
4. Open Measurements and run **RoofScan Lab** on a known property.
5. Confirm a building footprint is found.
6. Confirm USGS LiDAR products are found.
7. With the prototype enabled, inspect plane count, pitch, area, eave/rake and candidate ridge/hip/valley output.
8. Compare the prototype to a known field/EagleView/Nearmap report before trusting dimensions.

## Production measurement policy

The CW open-data worker remains intentionally gated as `prototype`. Prototype results are displayed in RoofScan Lab but are not saved into estimates.

Verified customer measurements can come from configured commercial providers or uploaded verified reports until the CW engine passes the real-roof benchmark.

## Accuracy gate before CW auto-save

- roof area within 2%
- pitch within 1/12
- major edge lengths within 3%
- no missing major facets, ridges or valleys

Only after those gates are demonstrated on the benchmark set should the worker be permitted to emit `status: verified`.

## Security audit gate

Production dependencies must pass `npm audit --omit=dev` before launch. This branch exists to apply and validate non-breaking dependency fixes before deployment.


## Railway production wiring

Use two services in the same Railway project/environment so the worker can remain private.

### Service 1: cw-roofing-pro

- Source: GitHub `ckc0008/CWRoofingPro`, branch `main`
- Root directory: `/`
- Dockerfile: detected automatically
- Public networking: generate a Railway domain
- Healthcheck: `/api/health`
- Persistent volume: mount at `/data`

Variables:
```
DATABASE_PATH=/data/data.db
UPLOADS_DIR=/data/uploads
GOOGLE_MAPS_API_KEY=<your key>
ROOFSCAN_WORKER_URL=http://${{roofscan-worker.RAILWAY_PRIVATE_DOMAIN}}:${{roofscan-worker.PORT}}
ROOFSCAN_WORKER_TOKEN=${{shared.ROOFSCAN_API_TOKEN}}
```

Optional commercial fallback:
```
ARTEMIS_API_URL=
ARTEMIS_API_KEY=
```

### Service 2: roofscan-worker

- Source: same GitHub repo/branch
- Root directory: `/roofscan-worker`
- Dockerfile: detected automatically
- Public networking: not required
- Healthcheck: `/health`

Variables:
```
ROOFSCAN_API_TOKEN=${{shared.ROOFSCAN_API_TOKEN}}
ROOFSCAN_ENABLE_LIDAR_PROTOTYPE=true
OVERTURE_RELEASE=2026-09-23.1
ROOFSCAN_LIDAR_CACHE=/tmp/roofscan-lidar
```

Create `ROOFSCAN_API_TOKEN` once as a shared secret and reference it from both services. The CRM can now read these environment variables directly if the equivalent setting has not been saved through the Settings screen.

The worker should stay on Railway private networking; only the CRM needs a public domain.
