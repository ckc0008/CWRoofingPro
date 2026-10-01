import json
import os
from functools import lru_cache

import duckdb
from pyproj import Geod
from shapely.geometry import Point, shape

OVERTURE_RELEASE = os.getenv('OVERTURE_RELEASE', '2026-09-23.1')
OVERTURE_BUILDINGS = (
    's3://overturemaps-us-west-2/release/'
    + OVERTURE_RELEASE
    + '/theme=buildings/type=building/*'
)


@lru_cache(maxsize=1)
def _connection():
    con = duckdb.connect()
    con.execute('INSTALL spatial;')
    con.execute('LOAD spatial;')
    con.execute('INSTALL httpfs;')
    con.execute('LOAD httpfs;')
    con.execute("SET s3_region='us-west-2';")
    return con


def _area_sqft(geom) -> float:
    geod = Geod(ellps='WGS84')
    area_m2, _ = geod.geometry_area_perimeter(geom)
    return abs(area_m2) * 10.76391041671


def find_building(lat: float, lng: float, radius_deg: float = 0.0018):
    xmin, xmax = lng - radius_deg, lng + radius_deg
    ymin, ymax = lat - radius_deg, lat + radius_deg
    sql = f'''
        SELECT
          id,
          height,
          level,
          ST_AsGeoJSON(geometry) AS geometry_json
        FROM read_parquet('{OVERTURE_BUILDINGS}', filename=true, hive_partitioning=1)
        WHERE bbox.xmin < ? AND bbox.xmax > ?
          AND bbox.ymin < ? AND bbox.ymax > ?
        LIMIT 100
    '''
    rows = _connection().execute(sql, [xmax, xmin, ymax, ymin]).fetchall()
    target = Point(lng, lat)
    candidates = []
    for building_id, height, level, geometry_json in rows:
        if not geometry_json:
            continue
        geom = shape(json.loads(geometry_json))
        distance = geom.distance(target)
        candidates.append({
            'id': building_id,
            'height': height,
            'level': level,
            'geometry': geom,
            'contains': geom.covers(target),
            'distance': distance,
        })

    if not candidates:
        return None

    containing = [c for c in candidates if c['contains']]
    selected = min(containing or candidates, key=lambda c: c['distance'])
    geom = selected.pop('geometry')
    minx, miny, maxx, maxy = geom.bounds
    return {
        **selected,
        'geometry': geom.__geo_interface__,
        'bbox': [minx, miny, maxx, maxy],
        'footprintAreaSqFt': round(_area_sqft(geom), 1),
        'overtureRelease': OVERTURE_RELEASE,
    }
