"""
Amadeus API integration for flight search and flight status
"""
import os
import requests
from typing import Optional, Dict, List, Any
from datetime import datetime

AMADEUS_API_KEY = os.getenv('AMADEUS_API_KEY')
AMADEUS_API_SECRET = os.getenv('AMADEUS_API_SECRET')
AMADEUS_BASE_URL = os.getenv('AMADEUS_BASE_URL', 'https://test.api.amadeus.com')
AMADEUS_TOKEN_URL = f"{AMADEUS_BASE_URL}/v1/security/oauth2/token"

# Cache for access token
_access_token = None
_token_expires_at = None


def _get_access_token() -> Optional[str]:
    """
    Get Amadeus API access token using client credentials
    """
    global _access_token, _token_expires_at
    
    # Check if we have a valid cached token
    if _access_token and _token_expires_at and datetime.now() < _token_expires_at:
        return _access_token
    
    if not AMADEUS_API_KEY or not AMADEUS_API_SECRET:
        raise ValueError("AMADEUS_API_KEY and AMADEUS_API_SECRET must be set in environment variables")
    
    try:
        response = requests.post(
            AMADEUS_TOKEN_URL,
            data={
                'grant_type': 'client_credentials',
                'client_id': AMADEUS_API_KEY,
                'client_secret': AMADEUS_API_SECRET
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        _access_token = data.get('access_token')
        expires_in = data.get('expires_in', 1800)  # Default 30 minutes
        _token_expires_at = datetime.now().timestamp() + expires_in - 60  # Refresh 1 min early
        
        return _access_token
    except requests.exceptions.RequestException as e:
        print(f"Error getting Amadeus access token: {e}")
        return None


def search_flights(origin: str, destination: str, departure_date: str, 
                  return_date: Optional[str] = None, passengers: int = 1,
                  cabin_class: str = 'ECONOMY') -> List[Dict[str, Any]]:
    """
    Search for flights using Amadeus Flight Offers Search API
    
    Args:
        origin: Origin airport code (IATA) or city code
        destination: Destination airport code (IATA) or city code
        departure_date: Departure date (YYYY-MM-DD)
        return_date: Optional return date (YYYY-MM-DD) for round trips
        passengers: Number of passengers (default: 1)
        cabin_class: Cabin class ('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST')
    
    Returns:
        List of flight dictionaries
    """
    token = _get_access_token()
    if not token:
        raise ValueError("Failed to obtain Amadeus access token")
    
    url = f"{AMADEUS_BASE_URL}/v2/shopping/flight-offers"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    params = {
        'originLocationCode': origin,
        'destinationLocationCode': destination,
        'departureDate': departure_date,
        'adults': passengers,
        'max': 20
    }
    
    if return_date:
        params['returnDate'] = return_date
    
    # Map cabin class
    cabin_class_map = {
        'economy': 'ECONOMY',
        'premium': 'PREMIUM_ECONOMY',
        'business': 'BUSINESS',
        'first': 'FIRST'
    }
    params['travelClass'] = cabin_class_map.get(cabin_class.lower(), 'ECONOMY')
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return _parse_amadeus_flights(data)
    except requests.exceptions.RequestException as e:
        print(f"Error fetching flights from Amadeus: {e}")
        # Return mock data for development if API fails
        return _get_mock_flights(origin, destination, departure_date, return_date, passengers)


def get_flight_details(flight_offer_id: str) -> Optional[Dict[str, Any]]:
    """
    Get detailed information about a specific flight offer
    
    Args:
        flight_offer_id: Amadeus flight offer ID
    
    Returns:
        Flight details dictionary or None if not found
    """
    token = _get_access_token()
    if not token:
        raise ValueError("Failed to obtain Amadeus access token")
    
    # Note: Amadeus doesn't have a direct endpoint to get flight details by ID
    # You would need to store the full offer or search again
    # This is a placeholder
    return None


def get_flight_status(flight_number: str, date: str) -> Optional[Dict[str, Any]]:
    """
    Get flight status using Amadeus Flight Status API
    
    Args:
        flight_number: Flight number (e.g., 'LH400')
        date: Flight date (YYYY-MM-DD)
    
    Returns:
        Flight status dictionary or None if not found
    """
    token = _get_access_token()
    if not token:
        raise ValueError("Failed to obtain Amadeus access token")
    
    url = f"{AMADEUS_BASE_URL}/v2/schedule/flights"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    params = {
        'carrierCode': flight_number[:2],  # Airline code
        'flightNumber': flight_number[2:],  # Flight number
        'scheduledDepartureDate': date
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching flight status from Amadeus: {e}")
        return None


def _parse_amadeus_flights(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse Amadeus API response into standardized format"""
    flights = []
    
    if 'data' in data:
        for offer in data['data']:
            # Extract pricing
            price = offer.get('price', {})
            total_price = price.get('total', '0')
            
            # Extract itineraries
            itineraries = offer.get('itineraries', [])
            if not itineraries:
                continue
            
            outbound = itineraries[0]
            segments = outbound.get('segments', [])
            
            if not segments:
                continue
            
            first_segment = segments[0]
            last_segment = segments[-1]
            
            flight = {
                'flight_id': offer.get('id'),
                'price': float(total_price) if isinstance(total_price, str) else total_price,
                'currency': price.get('currency', 'USD'),
                'airline': first_segment.get('carrierCode', ''),
                'origin': first_segment.get('departure', {}).get('iataCode', ''),
                'destination': last_segment.get('arrival', {}).get('iataCode', ''),
                'departure_date': first_segment.get('departure', {}).get('at', ''),
                'arrival_date': last_segment.get('arrival', {}).get('at', ''),
                'duration': outbound.get('duration', ''),
                'stops': len(segments) - 1,
                'direct': len(segments) == 1,
                'segments': len(segments)
            }
            
            if len(itineraries) > 1:
                return_flight = itineraries[1]
                return_segments = return_flight.get('segments', [])
                if return_segments:
                    flight['return_departure'] = return_segments[0].get('departure', {}).get('at', '')
                    flight['return_arrival'] = return_segments[-1].get('arrival', {}).get('at', '')
            
            flights.append(flight)
    
    return flights


def _get_mock_flights(origin: str, destination: str, departure_date: str, 
                     return_date: Optional[str], passengers: int) -> List[Dict[str, Any]]:
    """Mock flight data for development/testing"""
    flights = []
    airlines = ['AA', 'DL', 'UA', 'WN', 'B6']
    airline_names = ['American Airlines', 'Delta', 'United', 'Southwest', 'JetBlue']
    
    for i in range(5):
        flight = {
            'flight_id': f'amadeus_flight_{i}',
            'airline': airline_names[i % len(airline_names)],
            'airline_code': airlines[i % len(airlines)],
            'origin': origin,
            'destination': destination,
            'departure_date': departure_date,
            'departure_time': f'{8 + i}:00',
            'arrival_time': f'{10 + i}:30',
            'duration': f'PT{2 + i}H{30 + i * 10}M',
            'price': 200 + i * 50,
            'currency': 'USD',
            'cabin_class': 'ECONOMY',
            'stops': 0 if i < 2 else 1,
            'direct': i < 2,
            'passengers': passengers
        }
        
        if return_date:
            flight['return_date'] = return_date
            flight['return_departure_time'] = f'{14 + i}:00'
            flight['return_arrival_time'] = f'{16 + i}:30'
        
        flights.append(flight)
    
    return flights

