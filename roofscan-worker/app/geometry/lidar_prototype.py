import hashlib
import os
from pathlib import Path

import laspy
import numpy as np
import requests
from pyproj import CRS, Transformer
from shapely.geometry import shape
from shapely.ops import transform as transform_geom
from shapely import contains_xy
from app.geometry.metrics import classify_exterior_edges, estimate_facet_areas
from app.geometry.planes import segment_roof_planes
from app.geometry.topology import derive_candidate_edges

CACHE_DIR = Path(os.getenv('ROOFSCAN_LIDAR_CACHE', '/tmp/roofscan-lidar'))
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cached_download(url: str) -> Path:
    suffix = '.laz' if '.laz' in url.lower() else '.las'
    path = CACHE_DIR / (hashlib.sha256(url.encode()).hexdigest() + suffix)
    if path.exists() and path.stat().st_size > 0:
        return path
    with requests.get(url, stream=True, timeout=180) as response:
        response.raise_for_status()
        with path.open('wb') as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)
    return path


def dominant_roof_plane(building_geojson: dict, lidar_url: str) -> dict:
    path = _cached_download(lidar_url)
    las = laspy.read(path)
    source_crs = las.header.parse_crs()
    if source_crs is None:
        raise ValueError('LiDAR file does not declare a CRS')

    footprint = shape(building_geojson)
    transformer = Transformer.from_crs(CRS.from_epsg(4326), source_crs, always_xy=True)
    local_footprint = transform_geom(transformer.transform, footprint)

    x = np.asarray(las.x)
    y = np.asarray(las.y)
    z = np.asarray(las.z)
    minx, miny, maxx, maxy = local_footprint.bounds
    bbox_mask = (x >= minx) & (x <= maxx) & (y >= miny) & (y <= maxy)
    if bbox_mask.sum() < 100:
        raise ValueError('Not enough LiDAR points inside the building bounds')

    bx, by, bz = x[bbox_mask], y[bbox_mask], z[bbox_mask]
    inside = contains_xy(local_footprint, bx, by)
    bx, by, bz = bx[inside], by[inside], bz[inside]
    if len(bz) < 100:
        raise ValueError('Not enough LiDAR points inside the building footprint')

    # Prefer ASPRS building classification (6) when present.
    classes = np.asarray(las.classification)[bbox_mask][inside]
    building_mask = classes == 6
    if building_mask.sum() >= 100:
        bx, by, bz = bx[building_mask], by[building_mask], bz[building_mask]
    else:
        # Prototype fallback: remove likely ground/low returns. This is not enough
        # for production verification and therefore never yields verified status.
        cutoff = np.quantile(bz, 0.55)
        high = bz >= cutoff
        bx, by, bz = bx[high], by[high], bz[high]

    planes = segment_roof_planes(
        bx, by, bz,
        residual_threshold=0.22,
        min_points=max(80, min(250, int(len(bz) * 0.04))),
        max_planes=16,
    )
    if not planes:
        raise ValueError('No stable roof planes could be segmented from LiDAR points')

    dominant = planes[0]
    candidate_edges = derive_candidate_edges(
        bx,
        by,
        planes,
        adjacency_tolerance=1.0,
        min_edge_length=0.75,
    )

    horizontal_unit_to_meters = 1.0
    if source_crs.axis_info:
        horizontal_unit_to_meters = source_crs.axis_info[0].unit_conversion_factor or 1.0
    unit_to_feet = horizontal_unit_to_meters * 3.280839895

    facet_metrics = estimate_facet_areas(
        local_footprint,
        bx,
        by,
        planes,
        unit_to_feet=unit_to_feet,
    )
    exterior_metrics = classify_exterior_edges(
        local_footprint,
        bx,
        by,
        planes,
        unit_to_feet=unit_to_feet,
    )

    public_planes = [
        {key: value for key, value in plane.items() if key != 'sourceIndices'}
        for plane in planes
    ]

    return {
        'dominantPitchRise': dominant['pitchRise'],
        'dominantPitch': dominant['pitch'],
        'slopeDegrees': dominant['slopeDegrees'],
        'pointCount': int(len(bz)),
        'planeCount': len(public_planes),
        'planes': public_planes,
        'candidateEdges': candidate_edges,
        'facetMetrics': facet_metrics,
        'exteriorMetrics': exterior_metrics,
        'sourceCrs': source_crs.to_string(),
        'classification6Used': bool(building_mask.sum() >= 100),
    }