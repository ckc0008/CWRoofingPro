import numpy as np

from app.geometry.planes import segment_roof_planes
from app.geometry.topology import derive_candidate_edges


def _gable(valley: bool = False):
    rng = np.random.default_rng(7)
    n = 600
    x_left = rng.uniform(-10.0, -0.2, n)
    y_left = rng.uniform(-10.0, 10.0, n)
    x_right = rng.uniform(0.2, 10.0, n)
    y_right = rng.uniform(-10.0, 10.0, n)
    if valley:
        z_left = 20.0 - 0.5 * x_left + rng.normal(0, 0.015, n)
        z_right = 20.0 + 0.5 * x_right + rng.normal(0, 0.015, n)
    else:
        z_left = 20.0 + 0.5 * x_left + rng.normal(0, 0.015, n)
        z_right = 20.0 - 0.5 * x_right + rng.normal(0, 0.015, n)
    return (
        np.concatenate([x_left, x_right]),
        np.concatenate([y_left, y_right]),
        np.concatenate([z_left, z_right]),
    )


def test_gable_intersection_classifies_ridge():
    x, y, z = _gable(False)
    planes = segment_roof_planes(x, y, z, residual_threshold=0.06, min_points=180, max_planes=4)
    edges = derive_candidate_edges(x, y, planes, adjacency_tolerance=0.5, min_edge_length=4.0)
    assert edges
    assert edges[0]['type'] == 'ridge'
    assert edges[0]['length'] > 15.0


def test_inverted_gable_intersection_classifies_valley():
    x, y, z = _gable(True)
    planes = segment_roof_planes(x, y, z, residual_threshold=0.06, min_points=180, max_planes=4)
    edges = derive_candidate_edges(x, y, planes, adjacency_tolerance=0.5, min_edge_length=4.0)
    assert edges
    assert edges[0]['type'] == 'valley'
