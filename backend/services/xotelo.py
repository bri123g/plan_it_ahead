"""
Xotelo API integration for hotel/accommodation search and pricing
"""
import os
import requests
from typing import Optional, Dict, List, Any
from datetime import datetime

XOTELO_API_KEY = os.getenv('XOTELO_API_KEY')
XOTELO_BASE_URL = 'https://api.xotelo.com'


def search_hotels(location: str, check_in: str, check_out: str, guests: int = 2, 
                  min_price: Optional[float] = None, max_price: Optional[float] = None,
                  limit: int = 20) -> List[Dict[str, Any]]:
    """
    Search for hotels/accommodations using Xotelo API
    
    Args:
        location: Location name or coordinates
        check_in: Check-in date (YYYY-MM-DD)
        check_out: Check-out date (YYYY-MM-DD)
        guests: Number of guests (default: 2)
        min_price: Minimum price per night
        max_price: Maximum price per night
        limit: Maximum number of results (default: 20)
    
    Returns:
        List of hotel dictionaries
    """
    if not XOTELO_API_KEY:
        raise ValueError("XOTELO_API_KEY not set in environment variables")
    
    # Xotelo API endpoint for hotel search
    url = f"{XOTELO_BASE_URL}/api/hotels/search"
    headers = {
        'X-API-Key': XOTELO_API_KEY,
        'Content-Type': 'application/json'
    }
    
    params = {
        'location': location,
        'checkin': check_in,
        'checkout': check_out,
        'guests': guests,
        'limit': limit
    }
    
    if min_price:
        params['min_price'] = min_price
    if max_price:
        params['max_price'] = max_price
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get('hotels', [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching hotels from Xotelo: {e}")
        # Return mock data for development if API fails
        return _get_mock_hotels(location, check_in, check_out, guests, limit)


def get_hotel_details(hotel_id: str) -> Optional[Dict[str, Any]]:
    """
    Get detailed information about a specific hotel
    
    Args:
        hotel_id: Xotelo hotel ID
    
    Returns:
        Hotel details dictionary or None if not found
    """
    if not XOTELO_API_KEY:
        raise ValueError("XOTELO_API_KEY not set in environment variables")
    
    url = f"{XOTELO_BASE_URL}/api/hotels/{hotel_id}"
    headers = {
        'X-API-Key': XOTELO_API_KEY,
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching hotel details from Xotelo: {e}")
        return None


def get_pricing(hotel_id: str, check_in: str, check_out: str, guests: int = 2) -> Optional[Dict[str, Any]]:
    """
    Get latest pricing information for a hotel using Xotelo pricing API
    
    Args:
        hotel_id: Xotelo hotel ID
        check_in: Check-in date (YYYY-MM-DD)
        check_out: Check-out date (YYYY-MM-DD)
        guests: Number of guests
    
    Returns:
        Pricing information dictionary or None if not found
    """
    if not XOTELO_API_KEY:
        raise ValueError("XOTELO_API_KEY not set in environment variables")
    
    url = f"{XOTELO_BASE_URL}/api/hotels/{hotel_id}/pricing"
    headers = {
        'X-API-Key': XOTELO_API_KEY,
        'Content-Type': 'application/json'
    }
    params = {
        'checkin': check_in,
        'checkout': check_out,
        'guests': guests
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching pricing from Xotelo: {e}")
        return None


def get_hotel_heatmap(location: str, check_in: str, check_out: str) -> Optional[Dict[str, Any]]:
    """
    Get hotel pricing heatmap for a location
    
    Args:
        location: Location name or coordinates
        check_in: Check-in date (YYYY-MM-DD)
        check_out: Check-out date (YYYY-MM-DD)
    
    Returns:
        Heatmap data dictionary or None if not found
    """
    if not XOTELO_API_KEY:
        raise ValueError("XOTELO_API_KEY not set in environment variables")
    
    url = f"{XOTELO_BASE_URL}/api/heatmap"
    headers = {
        'X-API-Key': XOTELO_API_KEY,
        'Content-Type': 'application/json'
    }
    params = {
        'location': location,
        'checkin': check_in,
        'checkout': check_out
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching heatmap from Xotelo: {e}")
        return None


def _get_mock_hotels(location: str, check_in: str, check_out: str, guests: int, limit: int) -> List[Dict[str, Any]]:
    """Mock hotel data for development/testing"""
    return [
        {
            'hotel_id': f'xotelo_hotel_{i}',
            'name': f'Sample Hotel {i} in {location}',
            'location': location,
            'rating': 4.0 + (i % 2) * 0.5,
            'price_per_night': 100 + i * 20,
            'total_price': (100 + i * 20) * 4,  # Assuming 4 nights
            'image_url': f'https://via.placeholder.com/300x200?text=Hotel+{i}',
            'description': f'A nice hotel in {location}',
            'amenities': ['WiFi', 'Pool', 'Breakfast', 'Gym'],
            'check_in': check_in,
            'check_out': check_out,
            'guests': guests,
            'latitude': 40.7128 + (i * 0.01),
            'longitude': -74.0060 + (i * 0.01)
        }
        for i in range(1, min(limit + 1, 6))
    ]

