import hashlib
import math
import os
from pathlib import Path

import laspy
import numpy as np
import requests
from pyproj import CRS, Transformer
from shapely.geometry import shape
from shapely.ops import transform as transform_geom
from shapely import contains_xy
from sklearn.linear_model import LinearRegression, RANSACRegressor

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

    features = np.column_stack([bx, by])
    estimator = RANSACRegressor(
        estimator=LinearRegression(),
        min_samples=max(30, int(len(bz) * 0.15)),
        residual_threshold=0.25,
        random_state=42,
    )
    estimator.fit(features, bz)
    a, b = estimator.estimator_.coef_
    slope = math.sqrt(float(a) ** 2 + float(b) ** 2)
    pitch_rise = slope * 12.0
    angle_deg = math.degrees(math.atan(slope))
    inlier_ratio = float(np.mean(estimator.inlier_mask_))

    return {
        'dominantPitchRise': round(pitch_rise, 2),
        'dominantPitch': f'{round(pitch_rise)}/12',
        'slopeDegrees': round(angle_deg, 2),
        'pointCount': int(len(bz)),
        'planeInlierRatio': round(inlier_ratio, 4),
        'sourceCrs': source_crs.to_string(),
        'classification6Used': bool(building_mask.sum() >= 100),
    }
