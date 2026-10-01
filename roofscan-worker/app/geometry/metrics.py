import math
from typing import Any

import numpy as np
from shapely.geometry import LineString, MultiPoint, Point, Polygon


def _largest_polygon(geometry):
    if geometry.geom_type == 'Polygon':
        return geometry
    if geometry.geom_type == 'MultiPolygon':
        return max(geometry.geoms, key=lambda part: part.area)
    raise ValueError('Expected Polygon or MultiPolygon footprint')


def _plane_hull(x: np.ndarray, y: np.ndarray, plane: dict[str, Any]):
    indices = np.asarray(plane.get('sourceIndices', []), dtype=int)
    if len(indices) < 3:
        return None
    hull = MultiPoint(np.column_stack([x[indices], y[indices]]).tolist()).convex_hull
    return hull if not hull.is_empty else None


def estimate_facet_areas(
    footprint,
    x: np.ndarray,
    y: np.ndarray,
    planes: list[dict[str, Any]],
    *,
    unit_to_feet: float,
) -> dict[str, Any]:
    facets = []
    total_sqft = 0.0
    for plane in planes:
        hull = _plane_hull(x, y, plane)
        if hull is None:
            continue
        clipped = hull.intersection(footprint)
        planar_area = float(clipped.area)
        if planar_area <= 0:
            continue
        slope_factor = math.sqrt(1.0 + float(plane['a']) ** 2 + float(plane['b']) ** 2)
        area_sqft = planar_area * slope_factor * (unit_to_feet ** 2)
        total_sqft += area_sqft
        facets.append({
            'planeId': plane['id'],
            'planarAreaSqFt': round(planar_area * (unit_to_feet ** 2), 2),
            'roofAreaSqFt': round(area_sqft, 2),
            'pitch': plane['pitch'],
            'slopeFactor': round(slope_factor, 5),
        })
    return {
        'facets': facets,
        'totalRoofAreaSqFt': round(total_sqft, 2),
        'squares': round(total_sqft / 100.0, 3),
    }


def classify_exterior_edges(
    footprint,
    x: np.ndarray,
    y: np.ndarray,
    planes: list[dict[str, Any]],
    *,
    unit_to_feet: float,
    eave_pitch_threshold: float = 1.0,
) -> dict[str, Any]:
    polygon = _largest_polygon(footprint)
    plane_hulls = []
    for plane in planes:
        hull = _plane_hull(x, y, plane)
        if hull is not None:
            plane_hulls.append((plane, hull))

    edges = []
    totals = {'eaveLength': 0.0, 'rakeLength': 0.0}
    coords = list(polygon.exterior.coords)
    for start, end in zip(coords[:-1], coords[1:]):
        line = LineString([start, end])
        if line.length <= 1e-9 or not plane_hulls:
            continue
        midpoint = line.interpolate(0.5, normalized=True)
        plane, _ = min(plane_hulls, key=lambda item: item[1].distance(Point(midpoint.x, midpoint.y)))
        dx = (end[0] - start[0]) / line.length
        dy = (end[1] - start[1]) / line.length
        slope_along_edge = abs(float(plane['a']) * dx + float(plane['b']) * dy)
        edge_pitch_rise = slope_along_edge * 12.0
        edge_type = 'eave' if edge_pitch_rise <= eave_pitch_threshold else 'rake'
        length_ft = float(line.length) * unit_to_feet
        totals[edge_type + 'Length'] += length_ft
        edges.append({
            'type': edge_type,
            'planeId': plane['id'],
            'lengthFt': round(length_ft, 2),
            'edgePitchRise': round(edge_pitch_rise, 3),
            'coordinates': [list(start), list(end)],
        })

    return {
        'edges': edges,
        'eaveLength': round(totals['eaveLength'], 2),
        'rakeLength': round(totals['rakeLength'], 2),
    }
