# CW RoofScan Architecture

## Goal

Build a production roofing measurement engine inside CW Roofing Pro that returns traceable measurements for roof area/squares, pitch, facets, eaves, rakes, ridges, hips and valleys. The system must never fabricate geometry when a verified source is unavailable.

## Safety rule

- Verified source or explicit failure.
- No randomized or heuristic fallback values may be saved as roof measurements.
- Every result records a source.
- Low-confidence future CW-owned measurements must require review instead of silently passing.

## Provider architecture

The Express API calls `server/roofscan/index.ts`, which orchestrates provider adapters.

Initial adapters:

1. Artemis — commercial finished roof measurement provider. Requires an API URL and token supplied by Artemis.
2. CW Open Data — planned Houston/Texas-first pipeline using licensed/open aerial imagery plus LiDAR/elevation.
3. Nearmap — planned licensed imagery/measurement adapter.
4. EagleView — planned Measurement Orders API adapter.
5. Uploaded third-party report — existing PDF/XML extraction path remains supported.

## Planned CW-owned geometry pipeline

1. Resolve property location.
2. Select correct building footprint.
3. Fetch licensed aerial/ortho imagery.
4. Fetch DSM/LiDAR when available.
5. Segment roof mask and roof facets.
6. Fit planes to elevation points.
7. Derive pitch per plane.
8. Intersect planes to produce ridge/hip/valley topology.
9. Classify exterior edges as eave/rake.
10. Calculate true 3D facet area and line lengths.
11. Score confidence per facet and measurement.
12. Present editable roof wireframe for human correction.

## Houston/Texas priority

The first CW-owned data pipeline should target Greater Houston because high-quality public LiDAR/elevation data is available across the operating area. The implementation should keep imagery/elevation providers modular so other markets can fall back to commercial data.

## Target result contract

```json
{
  "source": "cw-open-data",
  "address": "123 Main St",
  "squares": 34.87,
  "totalArea": 3487,
  "pitch": "7/12",
  "facets": 12,
  "ridgeLength": 71.2,
  "valleyLength": 48.9,
  "eaveLength": 168.4,
  "hipLength": 112.6,
  "rakeLength": 94.7,
  "confidence": 0.972,
  "imageryDate": "2026-01-01"
}
```

## Accuracy validation

Before the CW-owned engine is allowed to auto-approve estimates, benchmark it against verified field/commercial reports. Initial acceptance targets:

- total roof area within 2%
- pitch within 1/12
- major edge lengths within 3%
- no missing major facets/ridges/valleys

Measurements failing acceptance should be marked for review.

## Next implementation phase

- Add `cw-open-data` provider adapter.
- Add a Python/FastAPI geospatial worker.
- Add LiDAR/DSM ingestion and plane fitting.
- Add building-footprint selection.
- Add roof geometry editor and confidence display.
- Persist provider metadata, imagery date and confidence in the measurement schema.
- Add benchmark fixtures from verified CW roofs.
