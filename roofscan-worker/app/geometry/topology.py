import math
from itertools import combinations
from typing import Any

import numpy as np
from shapely.geometry import LineString, MultiPoint


def _longest_line(geometry):
    if geometry.is_empty:
        return None
    if geometry.geom_type == 'LineString':
        return geometry
    if geometry.geom_type == 'MultiLineString':
        return max(geometry.geoms, key=lambda item: item.length, default=None)
    if geometry.geom_type == 'GeometryCollection':
        lines = [g for g in geometry.geoms if g.geom_type == 'LineString']
        return max(lines, key=lambda item: item.length, default=None)
    return None


def _plane_intersection_line(plane_a: dict, plane_b: dict, bounds: tuple[float, float, float, float]):
    # Equality of z=a*x+b*y+c for two planes gives A*x+B*y+C=0.
    A = float(plane_a['a']) - float(plane_b['a'])
    B = float(plane_a['b']) - float(plane_b['b'])
    C = float(plane_a['c']) - float(plane_b['c'])
    norm2 = A * A + B * B
    if norm2 < 1e-12:
        return None

    minx, miny, maxx, maxy = bounds
    cx, cy = (minx + maxx) / 2.0, (miny + maxy) / 2.0
    signed = (A * cx + B * cy + C) / norm2
    px, py = cx - A * signed, cy - B * signed
    norm = math.sqrt(norm2)
    dx, dy = -B / norm, A / norm
    span = max(maxx - minx, maxy - miny, 1.0) * 4.0
    return LineString([(px - dx * span, py - dy * span), (px + dx * span, py + dy * span)])


def _height(plane: dict, x: float, y: float) -> float:
    return float(plane['a']) * x + float(plane['b']) * y + float(plane['c'])


def _classify_edge(line: LineString, plane_a: dict, plane_b: dict, hull_a, hull_b) -> tuple[str, float]:
    midpoint = line.interpolate(0.5, normalized=True)
    mx, my = midpoint.x, midpoint.y
    changes = []
    for plane, hull in ((plane_a, hull_a), (plane_b, hull_b)):
        centroid = hull.centroid
        vx, vy = centroid.x - mx, centroid.y - my
        length = math.hypot(vx, vy)
        if length < 1e-9:
            changes.append(0.0)
            continue
        vx, vy = vx / length, vy / length
        changes.append(float(plane['a']) * vx + float(plane['b']) * vy)

    coords = list(line.coords)
    x1, y1 = coords[0]
    x2, y2 = coords[-1]
    planar_length = max(line.length, 1e-9)
    edge_slope = abs(_height(plane_a, x2, y2) - _height(plane_a, x1, y1)) / planar_length
    edge_pitch_rise = edge_slope * 12.0

    eps = 1e-4
    if changes[0] < -eps and changes[1] < -eps:
        # Convex interior edge. Nearly level intersections are ridges; descending
        # intersections are hips for this prototype classifier.
        return ('ridge' if edge_pitch_rise <= 1.0 else 'hip'), edge_pitch_rise
    if changes[0] > eps and changes[1] > eps:
        return 'valley', edge_pitch_rise
    return 'unknown', edge_pitch_rise


def derive_candidate_edges(
    x: np.ndarray,
    y: np.ndarray,
    planes: list[dict[str, Any]],
    *,
    adjacency_tolerance: float = 1.0,
    min_edge_length: float = 0.75,
) -> list[dict[str, Any]]:
    prepared = []
    for plane in planes:
        indices = np.asarray(plane.get('sourceIndices', []), dtype=int)
        if len(indices) < 3:
            continue
        hull = MultiPoint(np.column_stack([x[indices], y[indices]]).tolist()).convex_hull
        if hull.is_empty or hull.geom_type not in {'Polygon', 'MultiPolygon'}:
            continue
        prepared.append((plane, hull))

    edges = []
    for (plane_a, hull_a), (plane_b, hull_b) in combinations(prepared, 2):
        if hull_a.distance(hull_b) > adjacency_tolerance * 2.0:
            continue
        overlap = hull_a.buffer(adjacency_tolerance).intersection(hull_b.buffer(adjacency_tolerance))
        if overlap.is_empty:
            continue

        bounds = (
            min(hull_a.bounds[0], hull_b.bounds[0]),
            min(hull_a.bounds[1], hull_b.bounds[1]),
            max(hull_a.bounds[2], hull_b.bounds[2]),
            max(hull_a.bounds[3], hull_b.bounds[3]),
        )
        infinite_line = _plane_intersection_line(plane_a, plane_b, bounds)
        if infinite_line is None:
            continue
        clipped = _longest_line(infinite_line.intersection(overlap))
        if clipped is None or clipped.length < min_edge_length:
            continue

        edge_type, edge_pitch_rise = _classify_edge(clipped, plane_a, plane_b, hull_a, hull_b)
        coords = [[round(float(px), 3), round(float(py), 3)] for px, py in clipped.coords]
        edges.append({
            'type': edge_type,
            'planeA': plane_a['id'],
            'planeB': plane_b['id'],
            'length': round(float(clipped.length), 3),
            'edgePitchRise': round(float(edge_pitch_rise), 3),
            'coordinates': coords,
        })

    return sorted(edges, key=lambda edge: float(edge['length']), reverse=True)
