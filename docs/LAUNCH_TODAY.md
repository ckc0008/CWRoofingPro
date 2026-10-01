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
