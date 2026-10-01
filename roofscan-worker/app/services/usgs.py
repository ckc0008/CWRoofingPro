from typing import Any

import requests

TNM_PRODUCTS_URL = 'https://tnmaccess.nationalmap.gov/api/v1/products'
DATASET = 'Lidar Point Cloud (LPC)'


def find_lidar_products(bbox: list[float], max_items: int = 20) -> list[dict[str, Any]]:
    params = {
        'bbox': ','.join(str(v) for v in bbox),
        'datasets': DATASET,
        'prodFormats': 'LAS,LAZ',
        'outputFormat': 'JSON',
        'max': max_items,
    }
    response = requests.get(TNM_PRODUCTS_URL, params=params, timeout=45)
    response.raise_for_status()
    data = response.json()
    products = []
    for item in data.get('items', []):
        urls = item.get('urls') or {}
        download_url = urls.get('LAZ') or urls.get('LAS') or item.get('downloadURL')
        if not download_url:
            continue
        products.append({
            'title': item.get('title'),
            'publicationDate': item.get('publicationDate'),
            'lastUpdated': item.get('lastUpdated'),
            'downloadUrl': download_url,
            'metaUrl': item.get('metaUrl'),
            'sourceId': item.get('sourceId'),
        })
    return products
