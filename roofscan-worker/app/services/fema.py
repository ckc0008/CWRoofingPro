from typing import Any

import requests
from pyproj import Geod
from shapely.geometry import Point, shape

USA_STRUCTURES_QUERY = (
    'https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/'
    'USA_Structures_View/FeatureServer/0/query'
)


def _area_sqft(geom) -> float:
    geod = Geod(ellps='WGS84')
    area_m2, _ = geod.geometry_area_perimeter(geom)
    return abs(area_m2) * 10.76391041671


def find_building(lat: float, lng: float, radius_deg: float = 0.0018) -> dict[str, Any] | None:
    xmin, xmax = lng - radius_deg, lng + radius_deg
    ymin, ymax = lat - radius_deg, lat + radius_deg

    params = {
        'where': '1=1',
        'geometry': f'{xmin},{ymin},{xmax},{ymax}',
        'geometryType': 'esriGeometryEnvelope',
        'inSR': '4326',
        'spatialRel': 'esriSpatialRelIntersects',
        'outFields': '*',
        'returnGeometry': 'true',
        'outSR': '4326',
        'resultRecordCount': '50',
        'f': 'geojson',
    }
    response = requests.get(USA_STRUCTURES_QUERY, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()
    if data.get('error'):
        raise RuntimeError(data['error'])

    target = Point(lng, lat)
    candidates = []
    for feature in data.get('features', []):
        geometry = feature.get('geometry')
        if not geometry:
            continue
        geom = shape(geometry)
        if geom.is_empty:
            continue
        properties = feature.get('properties') or {}
        candidates.append({
            'geometryObject': geom,
            'contains': geom.covers(target),
            'distance': geom.distance(target),
            'properties': properties,
        })

    if not candidates:
        return None

    containing = [candidate for candidate in candidates if candidate['contains']]
    selected = min(containing or candidates, key=lambda candidate: candidate['distance'])
    geom = selected['geometryObject']
    properties = selected['properties']
    minx, miny, maxx, maxy = geom.bounds

    object_id = (
        properties.get('OBJECTID')
        or properties.get('ObjectID')
        or properties.get('objectid')
        or properties.get('FID')
    )

    return {
        'id': f'fema:{object_id}' if object_id is not None else 'fema:unknown',
        'height': properties.get('HEIGHT'),
        'level': None,
        'contains': bool(selected['contains']),
        'distance': float(selected['distance']),
        'geometry': geom.__geo_interface__,
        'bbox': [minx, miny, maxx, maxy],
        'footprintAreaSqFt': round(_area_sqft(geom), 1),
        'footprintProvider': 'FEMA USA Structures',
        'properties': {
            'address': properties.get('PROP_ADDR'),
            'city': properties.get('PROP_CITY'),
            'state': properties.get('PROP_ST'),
            'zip': properties.get('PROP_ZIP'),
            'occupancy': properties.get('OCC_CLS'),
        },
    }
