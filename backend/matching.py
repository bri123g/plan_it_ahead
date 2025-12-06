from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db_reflect import get_class, get_session
from services.ai_service import analyze_user_compatibility
from datetime import datetime
import json

bp = Blueprint('matching', __name__, url_prefix='/api/matching')


def _get_user_id():
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        return int(identity)
    except (ValueError, TypeError):
        return None


@bp.route('/find-companions', methods=['POST'])
@jwt_required()
def find_companions():
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    destination = data.get('destination', '').strip()
    start_date = data.get('start_date', '').strip()
    end_date = data.get('end_date', '').strip()
    user_preferences = data.get('preferences', {})
    
    if not destination:
        return jsonify({'msg': 'destination required'}), 400

    session = get_session()
    User = get_class('users')
    Itinerary = get_class('itinerary')
    
    pk_col = list(User.__table__.primary_key)[0].name
    current_user = session.query(User).filter(getattr(User, pk_col) == user_id).first()
    if not current_user:
        session.close()
        return jsonify({'msg': 'user not found'}), 404
    
    user1_prefs = user_preferences.copy()
    if hasattr(current_user, 'preferences') and current_user.preferences:
        prefs = current_user.preferences
        if isinstance(prefs, dict):
            user1_prefs.update(prefs)
        elif isinstance(prefs, str):
            try:
                user1_prefs.update(json.loads(prefs))
            except:
                pass
    
    user1_trip = {
        'destination': destination,
        'start_date': start_date,
        'end_date': end_date
    }
    
    matches = []
    
    all_users = session.query(User).filter(getattr(User, pk_col) != user_id).all()
    
    for other_user in all_users:
        other_user_id = getattr(other_user, pk_col)
        
        user2_prefs = {}
        if hasattr(other_user, 'preferences') and other_user.preferences:
            prefs = other_user.preferences
            if isinstance(prefs, dict):
                user2_prefs = prefs
            elif isinstance(prefs, str):
                try:
                    user2_prefs = json.loads(prefs)
                except:
                    user2_prefs = {}
        
        preferred_gender = user_preferences.get('preferred_gender', 'any')
        if preferred_gender != 'any' and user2_prefs.get('gender', '').lower() != preferred_gender.lower():
            continue
        
        user2_trip = {
            'destination': destination,
            'start_date': start_date,
            'end_date': end_date
        }
        
        compatibility = analyze_user_compatibility(
            user1_prefs=user1_prefs,
            user1_trip=user1_trip,
            user2_prefs=user2_prefs,
            user2_trip=user2_trip
        )
        
        if compatibility.get('compatibility_score', 0) > 30:
            match_info = {
                'user_id': other_user_id,
                'name': getattr(other_user, 'name', 'Unknown'),
                'email': getattr(other_user, 'email', ''),
                'compatibility_score': compatibility.get('compatibility_score', 0),
                'shared_interests': compatibility.get('shared_interests', []),
                'reasoning': compatibility.get('reasoning', ''),
                'destination_overlap': compatibility.get('destination_overlap', False),
                'date_overlap': compatibility.get('date_overlap', False),
                'preferences': user2_prefs
            }
            matches.append(match_info)
    
    matches.sort(key=lambda x: x['compatibility_score'], reverse=True)
    session.close()
    return jsonify({
        'matches': matches[:10],
        'count': len(matches)
    }), 200


@bp.route('/matches', methods=['GET'])
@jwt_required()
def get_matches():
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    session = get_session()
    try:
        Match = get_class('companionmatch')
    except:
        session.close()
        return jsonify({'matches': []}), 200
    
    User = get_class('users')
    
    user_matches = session.query(Match).filter(
        (getattr(Match, 'user1_id') == user_id) | (getattr(Match, 'user2_id') == user_id)
    ).all()
    
    matches_list = []
    pk_col = list(User.__table__.primary_key)[0].name
    
    for match in user_matches:
        other_user_id = getattr(match, 'user2_id') if getattr(match, 'user1_id') == user_id else getattr(match, 'user1_id')
        other_user = session.query(User).filter(getattr(User, pk_col) == other_user_id).first()
        
        match_dict = {}
        for key in match.__table__.columns.keys():
            value = getattr(match, key)
            if isinstance(value, datetime):
                match_dict[key] = value.isoformat()
            else:
                match_dict[key] = value
        
        if other_user:
            user_prefs = {}
            if hasattr(other_user, 'preferences') and other_user.preferences:
                prefs = other_user.preferences
                if isinstance(prefs, str):
                    try:
                        user_prefs = json.loads(prefs)
                    except:
                        pass
                elif isinstance(prefs, dict):
                    user_prefs = prefs
            
            match_dict['matched_user'] = {
                'user_id': other_user_id,
                'name': getattr(other_user, 'name', 'Unknown'),
                'email': getattr(other_user, 'email', ''),
                'preferences': user_prefs
            }
        
        matches_list.append(match_dict)
    
    session.close()
    return jsonify({'matches': matches_list}), 200


@bp.route('/<int:match_id>/connect', methods=['POST'])
@jwt_required()
def connect_match(match_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    other_user_id = data.get('user_id')
    
    if not other_user_id:
        return jsonify({'msg': 'user_id required'}), 400

    session = get_session()
    
    try:
        Match = get_class('companionmatch')
    except:
        session.close()
        return jsonify({'msg': 'match saved', 'match_id': 0}), 200
    
    existing_match = session.query(Match).filter(
        ((getattr(Match, 'user1_id') == user_id) & (getattr(Match, 'user2_id') == other_user_id)) |
        ((getattr(Match, 'user1_id') == other_user_id) & (getattr(Match, 'user2_id') == user_id))
    ).first()
    
    if existing_match:
        if hasattr(existing_match, 'status'):
            existing_match.status = 'connected'
        session.commit()
        match_id_val = getattr(existing_match, 'match_id', 0)
        session.close()
        return jsonify({'msg': 'match updated', 'match_id': match_id_val}), 200
    
    match_data = {
        'user1_id': min(user_id, other_user_id),
        'user2_id': max(user_id, other_user_id),
        'status': 'connected'
    }
    
    if hasattr(Match, 'compatibility_score'):
        match_data['compatibility_score'] = data.get('compatibility_score', 0)
    if hasattr(Match, 'created_at'):
        match_data['created_at'] = datetime.utcnow()
    
    new_match = Match(**match_data)
    session.add(new_match)
    session.commit()
    
    pk_col = list(Match.__table__.primary_key)[0].name
    match_id_val = getattr(new_match, pk_col, None)
    session.close()
    return jsonify({'msg': 'match created', 'match_id': match_id_val}), 201
