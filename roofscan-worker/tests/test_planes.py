import numpy as np

from app.geometry.planes import plane_metrics, segment_roof_planes


def test_plane_metrics_six_twelve():
    metrics = plane_metrics(0.5, 0.0)
    assert abs(metrics['pitchRise'] - 6.0) < 0.01
    assert metrics['pitch'] == '6/12'


def test_segments_two_gable_planes():
    rng = np.random.default_rng(42)
    n = 500
    x_left = rng.uniform(-10.0, -0.25, n)
    y_left = rng.uniform(-12.0, 12.0, n)
    z_left = 20.0 + 0.5 * x_left + rng.normal(0.0, 0.025, n)

    x_right = rng.uniform(0.25, 10.0, n)
    y_right = rng.uniform(-12.0, 12.0, n)
    z_right = 20.0 - 0.5 * x_right + rng.normal(0.0, 0.025, n)

    x = np.concatenate([x_left, x_right])
    y = np.concatenate([y_left, y_right])
    z = np.concatenate([z_left, z_right])

    planes = segment_roof_planes(x, y, z, residual_threshold=0.08, min_points=150, max_planes=4)
    assert len(planes) >= 2
    rises = sorted(float(p['pitchRise']) for p in planes[:2])
    assert 5.7 <= rises[0] <= 6.3
    assert 5.7 <= rises[1] <= 6.3
    assert all(float(p['medianResidual']) < 0.06 for p in planes[:2])
