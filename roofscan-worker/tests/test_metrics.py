import numpy as np
from shapely.geometry import Polygon

from app.geometry.metrics import classify_exterior_edges, estimate_facet_areas
from app.geometry.planes import segment_roof_planes


def _segmented_gable():
    rng = np.random.default_rng(11)
    n = 900
    x1 = rng.uniform(-10.0, -0.15, n)
    y1 = rng.uniform(-10.0, 10.0, n)
    z1 = 20.0 + 0.5 * x1 + rng.normal(0, 0.01, n)
    x2 = rng.uniform(0.15, 10.0, n)
    y2 = rng.uniform(-10.0, 10.0, n)
    z2 = 20.0 - 0.5 * x2 + rng.normal(0, 0.01, n)
    x = np.concatenate([x1, x2])
    y = np.concatenate([y1, y2])
    z = np.concatenate([z1, z2])
    planes = segment_roof_planes(x, y, z, residual_threshold=0.05, min_points=250, max_planes=4)
    return x, y, planes


def test_gable_exterior_eaves_and_rakes():
    x, y, planes = _segmented_gable()
    footprint = Polygon([(-10, -10), (10, -10), (10, 10), (-10, 10)])
    result = classify_exterior_edges(footprint, x, y, planes, unit_to_feet=1.0)
    assert len(result['edges']) == 4
    assert 39.0 <= result['eaveLength'] <= 41.0
    assert 39.0 <= result['rakeLength'] <= 41.0


def test_gable_facet_area_is_pitch_corrected():
    x, y, planes = _segmented_gable()
    footprint = Polygon([(-10, -10), (10, -10), (10, 10), (-10, 10)])
    result = estimate_facet_areas(footprint, x, y, planes, unit_to_feet=1.0)
    assert len(result['facets']) >= 2
    # 400 projected square units at 6/12 has a theoretical 3D area ~447.2.
    # Point-cloud hulls stop slightly short of the exact perimeter, so allow a
    # controlled prototype tolerance while ensuring pitch correction is applied.
    assert 420.0 <= result['totalRoofAreaSqFt'] <= 452.0
