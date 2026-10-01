import os
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app.geometry.lidar_prototype import dominant_roof_plane
from app.services.overture import find_building
from app.services.usgs import find_lidar_products

app = FastAPI(title='CW RoofScan Worker', version='0.1.0')

def require_api_token(authorization: str | None = Header(default=None)):
    expected = os.getenv('ROOFSCAN_API_TOKEN')
    if not expected:
        raise HTTPException(status_code=503, detail='ROOFSCAN_API_TOKEN is not configured')
    if authorization != f'Bearer {expected}':
        raise HTTPException(status_code=401, detail='Unauthorized')
    return True


class MeasureRequest(BaseModel):
    address: str
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


@app.get('/health')
def health():
    return {'ok': True, 'service': 'cw-roofscan-worker'}

@app.get('/ready')
def ready():
    return {
        'ready': bool(os.getenv('ROOFSCAN_API_TOKEN')),
        'service': 'cw-roofscan-worker',
        'lidarPrototypeEnabled': os.getenv('ROOFSCAN_ENABLE_LIDAR_PROTOTYPE', '').lower() in {'1', 'true', 'yes'},
    }


@app.post('/v1/measure', dependencies=[Depends(require_api_token)])
def measure(request: MeasureRequest) -> dict[str, Any]:
    try:
        building = find_building(request.lat, request.lng)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Building lookup failed: {exc}') from exc

    if not building:
        return {
            'status': 'insufficient_data',
            'reason': 'No Overture building footprint was found near the requested location.',
            'measurement': None,
            'provenance': {'buildingProvider': 'Overture Maps'},
        }

    try:
        lidar_products = find_lidar_products(building['bbox'])
    except Exception as exc:
        lidar_products = []
        lidar_error = str(exc)
    else:
        lidar_error = None

    provenance = {
        'buildingProvider': 'Overture Maps',
        'overtureRelease': building.get('overtureRelease'),
        'buildingId': building.get('id'),
        'footprintAreaSqFt': building.get('footprintAreaSqFt'),
        'lidarProvider': 'USGS 3DEP',
        'lidarProductsFound': len(lidar_products),
        'lidarError': lidar_error,
    }

    if not lidar_products:
        return {
            'status': 'insufficient_data',
            'reason': 'Building footprint found, but no USGS 3DEP LiDAR product was discovered for the footprint.',
            'measurement': None,
            'building': building,
            'provenance': provenance,
        }

    prototype = None
    if os.getenv('ROOFSCAN_ENABLE_LIDAR_PROTOTYPE', '').lower() in {'1', 'true', 'yes'}:
        try:
            prototype = dominant_roof_plane(building['geometry'], lidar_products[0]['downloadUrl'])
        except Exception as exc:
            prototype = {'error': str(exc)}

    # IMPORTANT: footprint area and a single dominant plane are not a complete
    # roofing measurement. Until multi-plane topology + edge classification +
    # benchmark QC are implemented, this endpoint intentionally stays unverified.
    return {
        'status': 'prototype',
        'reason': 'Real building and LiDAR sources were found; full facet topology is not yet certified.',
        'measurement': None,
        'building': building,
        'lidarProducts': lidar_products[:5],
        'prototype': prototype,
        'provenance': provenance,
    }
