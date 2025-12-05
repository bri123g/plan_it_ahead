"""
Search endpoints for destinations, attractions, hotels, and flights
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.opentripmap import search_pois, get_poi_details, get_nearby_pois
from services.xotelo import search_hotels, get_hotel_details, get_pricing, get_hotel_heatmap
from services.amadeus import search_flights, get_flight_details, get_flight_status
from services.wikivoyage import get_destination_guide, get_travel_tips, search_destinations

bp = Blueprint('search', __name__, url_prefix='/api/search')


@bp.route('/destinations', methods=['GET'])
@jwt_required(optional=True)
def search_destinations():
    """
    Search for destinations (countries/cities)
    Uses OpenTripMap geocoding to find locations
    """
    query = request.args.get('query', '').strip()
    
    if not query:
        return jsonify({'msg': 'query parameter required'}), 400
    
    try:
        # Use OpenTripMap to search for locations
        # This is a simplified implementation - in production, you might want
        # a dedicated geocoding service or database of destinations
        from services.opentripmap import OPENTRIPMAP_BASE_URL, OPENTRIPMAP_API_KEY
        import requests
        
        if not OPENTRIPMAP_API_KEY:
            return jsonify({'msg': 'OpenTripMap API key not configured'}), 500
        
        url = f"{OPENTRIPMAP_BASE_URL}/places/geoname"
        params = {
            'name': query,
            'apikey': OPENTRIPMAP_API_KEY
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data:
            destinations = [{
                'name': data.get('name', query),
                'country': data.get('country', ''),
                'lat': data.get('lat'),
                'lon': data.get('lon'),
                'type': 'city' if data.get('fcode', '').startswith('PPL') else 'location'
            }]
        else:
            destinations = []
        
        return jsonify({'destinations': destinations}), 200
    
    except Exception as e:
        print(f"Error searching destinations: {e}")
        return jsonify({'msg': 'Error searching destinations', 'error': str(e)}), 500


@bp.route('/attractions', methods=['GET'])
@jwt_required(optional=True)
def search_attractions():
    """
    Search for attractions/POIs
    Query params: location, category, radius, limit, lat, lon
    """
    location = request.args.get('location', '').strip()
    category = request.args.get('category')
    radius = request.args.get('radius', 5000, type=int)
    limit = request.args.get('limit', 20, type=int)
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    
    try:
        if lat and lon:
            # Search by coordinates
            pois = get_nearby_pois(lat, lon, radius, category, limit)
        elif location:
            # Search by location name
            pois = search_pois(location, category, radius, limit)
        else:
            return jsonify({'msg': 'location or lat/lon required'}), 400
        
        # Format response
        formatted_pois = []
        for poi in pois:
            if isinstance(poi, dict):
                props = poi.get('properties', {})
                geom = poi.get('geometry', {})
                coords = geom.get('coordinates', [])
                
                formatted_poi = {
                    'xid': props.get('xid'),
                    'name': props.get('name', 'Unknown'),
                    'category': props.get('kinds', '').split(',')[0] if props.get('kinds') else '',
                    'description': props.get('wikipedia_extracts', {}).get('text', '')[:200] if props.get('wikipedia_extracts') else '',
                    'lat': coords[1] if len(coords) > 1 else None,
                    'lon': coords[0] if len(coords) > 0 else None,
                    'distance': props.get('dist', 0),
                    'rate': props.get('rate', 0),
                    'image_url': props.get('preview', {}).get('source') if props.get('preview') else None
                }
                formatted_pois.append(formatted_poi)
        
        return jsonify({
            'attractions': formatted_pois,
            'count': len(formatted_pois)
        }), 200
    
    except Exception as e:
        print(f"Error searching attractions: {e}")
        return jsonify({'msg': 'Error searching attractions', 'error': str(e)}), 500


@bp.route('/attractions/<xid>', methods=['GET'])
@jwt_required(optional=True)
def get_attraction_details(xid):
    """Get detailed information about a specific attraction"""
    try:
        details = get_poi_details(xid)
        if not details:
            return jsonify({'msg': 'Attraction not found'}), 404
        
        # Format response
        formatted = {
            'xid': details.get('xid'),
            'name': details.get('name', 'Unknown'),
            'address': details.get('address', {}).get('display', '') if details.get('address') else '',
            'description': details.get('wikipedia_extracts', {}).get('text', '') if details.get('wikipedia_extracts') else '',
            'categories': details.get('kinds', '').split(',') if details.get('kinds') else [],
            'lat': details.get('point', {}).get('lat') if details.get('point') else None,
            'lon': details.get('point', {}).get('lon') if details.get('point') else None,
            'image_url': details.get('preview', {}).get('source') if details.get('preview') else None,
            'url': details.get('url'),
            'rate': details.get('rate', 0),
            'wikipedia': details.get('wikipedia', '')
        }
        
        return jsonify(formatted), 200
    
    except Exception as e:
        print(f"Error fetching attraction details: {e}")
        return jsonify({'msg': 'Error fetching attraction details', 'error': str(e)}), 500


@bp.route('/hotels', methods=['GET'])
@jwt_required(optional=True)
def search_hotels_endpoint():
    """
    Search for hotels/accommodations
    Query params: location, check_in, check_out, guests, min_price, max_price, limit
    """
    location = request.args.get('location', '').strip()
    check_in = request.args.get('check_in', '').strip()
    check_out = request.args.get('check_out', '').strip()
    guests = request.args.get('guests', 2, type=int)
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    limit = request.args.get('limit', 20, type=int)
    
    if not location:
        return jsonify({'msg': 'location parameter required'}), 400
    if not check_in or not check_out:
        return jsonify({'msg': 'check_in and check_out parameters required'}), 400
    
    try:
        hotels = search_hotels(location, check_in, check_out, guests, min_price, max_price, limit)
        
        return jsonify({
            'hotels': hotels,
            'count': len(hotels)
        }), 200
    
    except Exception as e:
        print(f"Error searching hotels: {e}")
        return jsonify({'msg': 'Error searching hotels', 'error': str(e)}), 500


@bp.route('/hotels/<hotel_id>', methods=['GET'])
@jwt_required(optional=True)
def get_hotel_details_endpoint(hotel_id):
    """Get detailed information about a specific hotel"""
    try:
        details = get_hotel_details(hotel_id)
        if not details:
            return jsonify({'msg': 'Hotel not found'}), 404
        
        return jsonify(details), 200
    
    except Exception as e:
        print(f"Error fetching hotel details: {e}")
        return jsonify({'msg': 'Error fetching hotel details', 'error': str(e)}), 500


@bp.route('/hotels/<hotel_id>/pricing', methods=['GET'])
@jwt_required(optional=True)
def get_hotel_pricing(hotel_id):
    """Get latest pricing for a hotel for specific dates using Xotelo"""
    check_in = request.args.get('check_in', '').strip()
    check_out = request.args.get('check_out', '').strip()
    guests = request.args.get('guests', 2, type=int)
    
    if not check_in or not check_out:
        return jsonify({'msg': 'check_in and check_out parameters required'}), 400
    
    try:
        pricing = get_pricing(hotel_id, check_in, check_out, guests)
        if not pricing:
            return jsonify({'msg': 'Pricing not available'}), 404
        
        return jsonify(pricing), 200
    
    except Exception as e:
        print(f"Error fetching hotel pricing: {e}")
        return jsonify({'msg': 'Error fetching hotel pricing', 'error': str(e)}), 500


@bp.route('/hotels/heatmap', methods=['GET'])
@jwt_required(optional=True)
def get_hotel_heatmap_endpoint():
    """Get hotel pricing heatmap for a location using Xotelo"""
    location = request.args.get('location', '').strip()
    check_in = request.args.get('check_in', '').strip()
    check_out = request.args.get('check_out', '').strip()
    
    if not location or not check_in or not check_out:
        return jsonify({'msg': 'location, check_in, and check_out parameters required'}), 400
    
    try:
        heatmap = get_hotel_heatmap(location, check_in, check_out)
        if not heatmap:
            return jsonify({'msg': 'Heatmap not available'}), 404
        
        return jsonify(heatmap), 200
    
    except Exception as e:
        print(f"Error fetching hotel heatmap: {e}")
        return jsonify({'msg': 'Error fetching hotel heatmap', 'error': str(e)}), 500


@bp.route('/flights', methods=['GET'])
@jwt_required(optional=True)
def search_flights_endpoint():
    """
    Search for flights
    Query params: origin, destination, departure_date, return_date, passengers, cabin_class
    """
    origin = request.args.get('origin', '').strip()
    destination = request.args.get('destination', '').strip()
    departure_date = request.args.get('departure_date', '').strip()
    return_date = request.args.get('return_date', '').strip() or None
    passengers = request.args.get('passengers', 1, type=int)
    cabin_class = request.args.get('cabin_class', 'economy')
    
    if not origin or not destination or not departure_date:
        return jsonify({'msg': 'origin, destination, and departure_date parameters required'}), 400
    
    try:
        flights = search_flights(origin, destination, departure_date, return_date, passengers, cabin_class)
        
        return jsonify({
            'flights': flights,
            'count': len(flights)
        }), 200
    
    except Exception as e:
        print(f"Error searching flights: {e}")
        return jsonify({'msg': 'Error searching flights', 'error': str(e)}), 500


@bp.route('/flights/<flight_id>', methods=['GET'])
@jwt_required(optional=True)
def get_flight_details_endpoint(flight_id):
    """Get detailed information about a specific flight"""
    try:
        details = get_flight_details(flight_id)
        if not details:
            return jsonify({'msg': 'Flight not found'}), 404
        
        return jsonify(details), 200
    
    except Exception as e:
        print(f"Error fetching flight details: {e}")
        return jsonify({'msg': 'Error fetching flight details', 'error': str(e)}), 500


@bp.route('/flights/status', methods=['GET'])
@jwt_required(optional=True)
def get_flight_status_endpoint():
    """Get flight status using Amadeus"""
    flight_number = request.args.get('flight_number', '').strip()
    date = request.args.get('date', '').strip()
    
    if not flight_number or not date:
        return jsonify({'msg': 'flight_number and date parameters required'}), 400
    
    try:
        status = get_flight_status(flight_number, date)
        if not status:
            return jsonify({'msg': 'Flight status not available'}), 404
        
        return jsonify(status), 200
    
    except Exception as e:
        print(f"Error fetching flight status: {e}")
        return jsonify({'msg': 'Error fetching flight status', 'error': str(e)}), 500


@bp.route('/guides/<destination>', methods=['GET'])
@jwt_required(optional=True)
def get_destination_guide_endpoint(destination):
    """Get travel guide for a destination from Wikivoyage"""
    try:
        guide = get_destination_guide(destination)
        if not guide:
            return jsonify({'msg': 'Guide not found'}), 404
        
        return jsonify(guide), 200
    
    except Exception as e:
        print(f"Error fetching destination guide: {e}")
        return jsonify({'msg': 'Error fetching destination guide', 'error': str(e)}), 500


@bp.route('/tips/<destination>', methods=['GET'])
@jwt_required(optional=True)
def get_travel_tips_endpoint(destination):
    """Get travel tips for a destination from Wikivoyage"""
    try:
        tips = get_travel_tips(destination)
        if not tips:
            return jsonify({'msg': 'Tips not found'}), 404
        
        return jsonify(tips), 200
    
    except Exception as e:
        print(f"Error fetching travel tips: {e}")
        return jsonify({'msg': 'Error fetching travel tips', 'error': str(e)}), 500

