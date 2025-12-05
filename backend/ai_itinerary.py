from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db_reflect import get_class, get_session
from services.ai_service import generate_itinerary, recommend_attractions
import json

bp = Blueprint('ai', __name__, url_prefix='/api/ai')


@bp.route('/generate-itinerary', methods=['POST'])
@jwt_required()
def generate_itinerary_endpoint():
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id')
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    destination = data.get('destination', '').strip()
    start_date = data.get('start_date', '').strip()
    end_date = data.get('end_date', '').strip()
    budget = data.get('budget', type=float)
    
    if not destination or not start_date or not end_date:
        return jsonify({'msg': 'destination, start_date, and end_date required'}), 400
    
    session = get_session()
    User = get_class('users')
    pk_col = list(User.__table__.primary_key)[0].name
    user = session.query(User).filter(getattr(User, pk_col) == user_id).first()
    
    user_prefs = {}
    if user and hasattr(user, 'preferences'):
        prefs = user.preferences
        if isinstance(prefs, dict):
            user_prefs = prefs
        elif isinstance(prefs, str):
            user_prefs = json.loads(prefs)
    
    if 'preferences' in data:
        user_prefs.update(data['preferences'])
    
    itinerary = generate_itinerary(
        user_prefs=user_prefs,
        destination=destination,
        start_date=start_date,
        end_date=end_date,
        budget=budget
    )
    
    session.close()
    return jsonify(itinerary), 200


@bp.route('/recommend-attractions', methods=['POST'])
@jwt_required()
def recommend_attractions_endpoint():
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id')
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    destination = data.get('destination', '').strip()
    current_itinerary = data.get('current_itinerary', [])
    
    if not destination:
        return jsonify({'msg': 'destination required'}), 400
    
    session = get_session()
    User = get_class('users')
    pk_col = list(User.__table__.primary_key)[0].name
    user = session.query(User).filter(getattr(User, pk_col) == user_id).first()
    
    user_prefs = {}
    if user and hasattr(user, 'preferences'):
        prefs = user.preferences
        if isinstance(prefs, dict):
            user_prefs = prefs
        elif isinstance(prefs, str):
            user_prefs = json.loads(prefs)
    
    if 'preferences' in data:
        user_prefs.update(data['preferences'])
    
    recommendations = recommend_attractions(
        user_prefs=user_prefs,
        destination=destination,
        current_itinerary=current_itinerary
    )
    
    session.close()
    return jsonify({
        'recommendations': recommendations,
        'count': len(recommendations)
    }), 200
