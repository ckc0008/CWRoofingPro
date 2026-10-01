import math
from typing import Any

import numpy as np
from sklearn.linear_model import LinearRegression, RANSACRegressor


def plane_metrics(a: float, b: float) -> dict[str, float | str]:
    slope = math.sqrt(float(a) ** 2 + float(b) ** 2)
    pitch_rise = slope * 12.0
    slope_degrees = math.degrees(math.atan(slope))
    # Aspect points downhill, clockwise from north.
    aspect = (math.degrees(math.atan2(-float(a), -float(b))) + 360.0) % 360.0
    return {
        'pitchRise': round(pitch_rise, 3),
        'pitch': f'{round(pitch_rise)}/12',
        'slopeDegrees': round(slope_degrees, 3),
        'aspectDegrees': round(aspect, 3),
    }


def segment_roof_planes(
    x: np.ndarray,
    y: np.ndarray,
    z: np.ndarray,
    *,
    residual_threshold: float = 0.20,
    min_points: int = 80,
    max_planes: int = 16,
) -> list[dict[str, Any]]:
    if not (len(x) == len(y) == len(z)):
        raise ValueError('x, y and z arrays must have equal length')
    if len(z) < min_points:
        return []

    remaining = np.arange(len(z))
    planes: list[dict[str, Any]] = []

    for plane_index in range(max_planes):
        if len(remaining) < min_points:
            break

        features = np.column_stack([x[remaining], y[remaining]])
        target = z[remaining]
        min_samples = min(len(remaining), max(20, int(len(remaining) * 0.05)))
        estimator = RANSACRegressor(
            estimator=LinearRegression(),
            min_samples=min_samples,
            residual_threshold=residual_threshold,
            random_state=42 + plane_index,
            max_trials=250,
        )
        estimator.fit(features, target)
        mask = estimator.inlier_mask_
        if mask is None:
            break
        inlier_count = int(mask.sum())
        if inlier_count < min_points:
            break

        model = estimator.estimator_
        a, b = (float(v) for v in model.coef_)
        c = float(model.intercept_)
        source_indices = remaining[mask]
        residuals = np.abs(z[source_indices] - (a * x[source_indices] + b * y[source_indices] + c))
        metrics = plane_metrics(a, b)
        planes.append({
            'id': plane_index + 1,
            'a': a,
            'b': b,
            'c': c,
            **metrics,
            'pointCount': inlier_count,
            'medianResidual': round(float(np.median(residuals)), 4),
            'p95Residual': round(float(np.quantile(residuals, 0.95)), 4),
            'sourceIndices': source_indices.tolist(),
        })
        remaining = remaining[~mask]

    return sorted(planes, key=lambda plane: int(plane['pointCount']), reverse=True)
