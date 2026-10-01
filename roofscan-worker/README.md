# CW RoofScan Geospatial Worker

This service is the CW-owned geospatial sidecar for roof measurement research and production.

## Current phase

- Queries the current configured Overture Maps building GeoParquet release for the target building footprint.
- Queries USGS TNMAccess for 3DEP LAS/LAZ products intersecting the building.
- Optionally downloads one LAZ tile and fits a dominant roof plane for engineering validation.
- Returns `prototype` or `insufficient_data`; it does **not** return `verified` yet.

The Express provider accepts a result only when this worker returns `status: verified`. That gate prevents footprint-only or experimental geometry from entering estimates.

## Run

```bash
cd roofscan-worker
docker build -t cw-roofscan-worker .
docker run --rm -p 8080:8080 cw-roofscan-worker
```

Set `roofscan_worker_url` in CW Roofing Pro Settings to the deployed service URL.

Optional environment variables:

- `OVERTURE_RELEASE` — defaults to the release pinned in `app/services/overture.py`.
- `ROOFSCAN_ENABLE_LIDAR_PROTOTYPE=true` — enables LAZ download + dominant-plane prototype. Keep disabled on production until benchmarked.
- `ROOFSCAN_LIDAR_CACHE=/path` — cache directory for downloaded LAS/LAZ files.

## Verification gate still required

Before the worker can emit `verified`, implement multi-plane segmentation, ridge/hip/valley topology, eave/rake classification, 3D facet-area calculations, obstruction handling and benchmark acceptance tests.

## Same-day Railway deployment

1. Create a Railway service from this GitHub repository.
2. Set the service Root Directory to `/roofscan-worker`.
3. Railway will detect `roofscan-worker/Dockerfile`.
4. Add `ROOFSCAN_API_TOKEN` with a long random value.
5. For prototype field diagnostics, set `ROOFSCAN_ENABLE_LIDAR_PROTOTYPE=true`.
6. Generate a public Railway domain.
7. In CW Roofing Pro Settings, set:
   - `CW RoofScan Worker URL` = the Railway service URL
   - `CW RoofScan Worker Token` = the exact same token
8. Verify `/health` returns OK and use RoofScan Lab on the Measurements page.

The worker uses Railway's injected `PORT` automatically. The `/v1/measure` endpoint requires bearer authentication. Keep the prototype verification gate enabled; prototype results are never automatically saved as customer measurements.
