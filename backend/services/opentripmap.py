"""
OpenTripMap API integration for Points of Interest (POI) data
"""
import os
import requests
from typing import Optional, Dict, List, Any

OPENTRIPMAP_API_KEY = os.getenv('OPENTRIPMAP_API_KEY')
OPENTRIPMAP_BASE_URL = 'https://api.opentripmap.io/0.1/en'


def search_pois(location: str, category: Optional[str] = None, radius: int = 5000, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Search for Points of Interest near a location
    
    Args:
        location: Location name or coordinates (lat,lon)
        category: Optional category filter (e.g., 'interesting_places', 'accomodations', 'restaurants')
        radius: Search radius in meters (default: 5000)
        limit: Maximum number of results (default: 20)
    
    Returns:
        List of POI dictionaries
    """
    if not OPENTRIPMAP_API_KEY:
        raise ValueError("OPENTRIPMAP_API_KEY not set in environment variables")
    
    # First, get coordinates for the location
    geocode_url = f"{OPENTRIPMAP_BASE_URL}/places/geoname"
    geocode_params = {
        'name': location,
        'apikey': OPENTRIPMAP_API_KEY
    }
    
    try:
        geocode_response = requests.get(geocode_url, params=geocode_params, timeout=10)
        geocode_response.raise_for_status()
        geocode_data = geocode_response.json()
        
        if not geocode_data or 'lat' not in geocode_data:
            return []
        
        lat = geocode_data['lat']
        lon = geocode_data['lon']
        
        # Search POIs
        pois_url = f"{OPENTRIPMAP_BASE_URL}/places/radius"
        pois_params = {
            'radius': radius,
            'lon': lon,
            'lat': lat,
            'limit': limit,
            'apikey': OPENTRIPMAP_API_KEY
        }
        
        if category:
            pois_params['kinds'] = category
        
        pois_response = requests.get(pois_url, params=pois_params, timeout=10)
        pois_response.raise_for_status()
        pois_data = pois_response.json()
        
        return pois_data.get('features', [])
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching POIs from OpenTripMap: {e}")
        return []


def get_poi_details(xid: str) -> Optional[Dict[str, Any]]:
    """
    Get detailed information about a specific POI
    
    Args:
        xid: OpenTripMap XID (external ID) of the POI
    
    Returns:
        POI details dictionary or None if not found
    """
    if not OPENTRIPMAP_API_KEY:
        raise ValueError("OPENTRIPMAP_API_KEY not set in environment variables")
    
    url = f"{OPENTRIPMAP_BASE_URL}/places/xid/{xid}"
    params = {'apikey': OPENTRIPMAP_API_KEY}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching POI details from OpenTripMap: {e}")
        return None


def get_nearby_pois(lat: float, lon: float, radius: int = 5000, category: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Get POIs near specific coordinates
    
    Args:
        lat: Latitude
        lon: Longitude
        radius: Search radius in meters (default: 5000)
        category: Optional category filter
        limit: Maximum number of results (default: 20)
    
    Returns:
        List of POI dictionaries
    """
    if not OPENTRIPMAP_API_KEY:
        raise ValueError("OPENTRIPMAP_API_KEY not set in environment variables")
    
    url = f"{OPENTRIPMAP_BASE_URL}/places/radius"
    params = {
        'radius': radius,
        'lon': lon,
        'lat': lat,
        'limit': limit,
        'apikey': OPENTRIPMAP_API_KEY
    }
    
    if category:
        params['kinds'] = category
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get('features', [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching nearby POIs from OpenTripMap: {e}")
        return []


def get_poi_categories() -> List[Dict[str, Any]]:
    """
    Get list of available POI categories
    
    Returns:
        List of category dictionaries
    """
    if not OPENTRIPMAP_API_KEY:
        raise ValueError("OPENTRIPMAP_API_KEY not set in environment variables")
    
    url = f"{OPENTRIPMAP_BASE_URL}/places/kinds"
    params = {'apikey': OPENTRIPMAP_API_KEY}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching categories from OpenTripMap: {e}")
        return []

