from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db_reflect import get_class, get_session
from datetime import datetime

bp = Blueprint('itineraries', __name__, url_prefix='/api/itineraries')


def _parse_datetime(s):
    if not s:
        return None
    try:
        # accept ISO format
        return datetime.fromisoformat(s)
    except Exception:
        return None


@bp.route('', methods=['POST'])
@jwt_required()
def create_itinerary():
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    activity_start_time = _parse_datetime(data.get('activity_start_time'))
    total_cost = data.get('total_cost')

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = Itinerary(user_id=user_id, activity_start_time=activity_start_time, total_cost=total_cost)
        session.add(it)
        session.commit()
        return jsonify({
            'itinerary_id': it.itinerary_id,
            'user_id': it.user_id,
            'activity_start_time': str(it.activity_start_time) if it.activity_start_time else None,
            'total_cost': float(it.total_cost) if it.total_cost is not None else None
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('', methods=['GET'])
@jwt_required()
def list_itineraries():
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        rows = session.query(Itinerary).filter_by(user_id=user_id).all()
        out = []
        for it in rows:
            out.append({
                'itinerary_id': it.itinerary_id,
                'user_id': it.user_id,
                'activity_start_time': str(it.activity_start_time) if it.activity_start_time else None,
                'total_cost': float(it.total_cost) if it.total_cost is not None else None
            })
        return jsonify(out), 200
    finally:
        session.close()


@bp.route('/<int:itinerary_id>', methods=['GET'])
@jwt_required()
def get_itinerary(itinerary_id):
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        return jsonify({
            'itinerary_id': it.itinerary_id,
            'user_id': it.user_id,
            'activity_start_time': str(it.activity_start_time) if it.activity_start_time else None,
            'total_cost': float(it.total_cost) if it.total_cost is not None else None
        }), 200
    finally:
        session.close()


@bp.route('/<int:itinerary_id>', methods=['PUT'])
@jwt_required()
def update_itinerary(itinerary_id):
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    activity_start_time = _parse_datetime(data.get('activity_start_time'))
    total_cost = data.get('total_cost')

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        if activity_start_time is not None:
            it.activity_start_time = activity_start_time
        if total_cost is not None:
            it.total_cost = total_cost
        session.commit()
        return jsonify({'msg': 'updated'}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('/<int:itinerary_id>', methods=['DELETE'])
@jwt_required()
def delete_itinerary(itinerary_id):
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        session.delete(it)
        session.commit()
        return jsonify({'msg': 'deleted'}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/budget', methods=['POST'])
@jwt_required()
def calculate_budget(itinerary_id):
    """Enhanced budget calculation: sums all items in the itinerary"""
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        # Try to get itinerary items if table exists
        total_budget = 0.0
        try:
            ItineraryItem = get_class('itinerary_item')
            items = session.query(ItineraryItem).filter_by(itinerary_id=itinerary_id).all()
            for item in items:
                if hasattr(item, 'estimated_cost') and item.estimated_cost:
                    total_budget += float(item.estimated_cost)
        except (RuntimeError, AttributeError):
            # If itinerary_item table doesn't exist, fall back to total_cost
            total_budget = float(it.total_cost) if it.total_cost is not None else 0.0
        
        return jsonify({
            'itinerary_id': it.itinerary_id,
            'estimated_budget': total_budget,
            'item_count': len(items) if 'items' in locals() else 0
        }), 200
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/items', methods=['GET'])
@jwt_required()
def get_itinerary_items(itinerary_id):
    """Get all items in an itinerary"""
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        # Try to get itinerary items
        try:
            ItineraryItem = get_class('itinerary_item')
            items = session.query(ItineraryItem).filter_by(itinerary_id=itinerary_id).order_by(ItineraryItem.item_order.asc() if hasattr(ItineraryItem, 'item_order') else ItineraryItem.item_id.asc()).all()
            
            items_list = []
            for item in items:
                item_dict = {}
                # Dynamically get all attributes
                for key in item.__table__.columns.keys():
                    value = getattr(item, key)
                    if isinstance(value, datetime):
                        item_dict[key] = value.isoformat()
                    else:
                        item_dict[key] = value
                items_list.append(item_dict)
            
            return jsonify({'items': items_list}), 200
        except (RuntimeError, AttributeError):
            # If table doesn't exist, return empty list
            return jsonify({'items': []}), 200
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/items', methods=['POST'])
@jwt_required()
def add_itinerary_item(itinerary_id):
    """Add an item (attraction, hotel, flight) to an itinerary"""
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    item_type = data.get('item_type')  # 'attraction', 'hotel', 'flight'
    item_id = data.get('item_id')  # External ID (xid, hotel_id, flight_id)
    item_name = data.get('item_name', '')
    estimated_cost = data.get('estimated_cost', 0.0)
    day_number = data.get('day_number', 1)
    time = data.get('time', '')
    duration_minutes = data.get('duration_minutes', 60)
    item_order = data.get('item_order', 0)
    metadata = data.get('metadata', {})  # Additional item data

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        # Try to add item to itinerary_item table
        try:
            ItineraryItem = get_class('itinerary_item')
            
            # Get max order if not provided
            if item_order == 0:
                max_order = session.query(session.query(ItineraryItem).filter_by(itinerary_id=itinerary_id).count()).scalar() or 0
                item_order = max_order + 1
            
            # Create item with available columns
            item_data = {
                'itinerary_id': itinerary_id,
                'item_type': item_type,
                'item_id': item_id,
                'item_name': item_name,
                'estimated_cost': estimated_cost,
                'day_number': day_number,
                'item_order': item_order
            }
            
            # Add optional fields if they exist in the table
            if hasattr(ItineraryItem, 'time'):
                item_data['time'] = time
            if hasattr(ItineraryItem, 'duration_minutes'):
                item_data['duration_minutes'] = duration_minutes
            if hasattr(ItineraryItem, 'metadata'):
                item_data['metadata'] = metadata
            
            item = ItineraryItem(**item_data)
            session.add(item)
            session.commit()
            
            # Return created item
            item_dict = {}
            for key in item.__table__.columns.keys():
                value = getattr(item, key)
                if isinstance(value, datetime):
                    item_dict[key] = value.isoformat()
                else:
                    item_dict[key] = value
            
            return jsonify({'item': item_dict}), 201
        except (RuntimeError, AttributeError) as e:
            # If table doesn't exist, return error
            return jsonify({'msg': 'itinerary_item table not found', 'error': str(e)}), 500
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_itinerary_item(itinerary_id, item_id):
    """Update an itinerary item"""
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        try:
            ItineraryItem = get_class('itinerary_item')
            item = session.query(ItineraryItem).filter_by(
                item_id=item_id,
                itinerary_id=itinerary_id
            ).first()
            
            if not item:
                return jsonify({'msg': 'item not found'}), 404
            
            # Update fields that are provided
            updatable_fields = ['item_name', 'estimated_cost', 'day_number', 'time', 'duration_minutes', 'item_order', 'metadata']
            for field in updatable_fields:
                if field in data and hasattr(item, field):
                    setattr(item, field, data[field])
            
            session.commit()
            return jsonify({'msg': 'updated'}), 200
        except (RuntimeError, AttributeError) as e:
            return jsonify({'msg': 'itinerary_item table not found', 'error': str(e)}), 500
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_itinerary_item(itinerary_id, item_id):
    """Remove an item from an itinerary"""
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        try:
            ItineraryItem = get_class('itinerary_item')
            item = session.query(ItineraryItem).filter_by(
                item_id=item_id,
                itinerary_id=itinerary_id
            ).first()
            
            if not item:
                return jsonify({'msg': 'item not found'}), 404
            
            session.delete(item)
            session.commit()
            return jsonify({'msg': 'deleted'}), 200
        except (RuntimeError, AttributeError) as e:
            return jsonify({'msg': 'itinerary_item table not found', 'error': str(e)}), 500
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/items/reorder', methods=['PUT'])
@jwt_required()
def reorder_itinerary_items(itinerary_id):
    """Reorder items in an itinerary (for drag-and-drop)"""
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id') if isinstance(identity, dict) else None
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    item_orders = data.get('item_orders', [])  # List of {item_id: new_order}
    
    if not item_orders:
        return jsonify({'msg': 'item_orders required'}), 400

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        try:
            ItineraryItem = get_class('itinerary_item')
            
            # Update order for each item
            for order_data in item_orders:
                item_id = order_data.get('item_id')
                new_order = order_data.get('item_order')
                
                if item_id and new_order is not None:
                    item = session.query(ItineraryItem).filter_by(
                        item_id=item_id,
                        itinerary_id=itinerary_id
                    ).first()
                    
                    if item and hasattr(item, 'item_order'):
                        item.item_order = new_order
            
            session.commit()
            return jsonify({'msg': 'reordered'}), 200
        except (RuntimeError, AttributeError) as e:
            return jsonify({'msg': 'itinerary_item table not found', 'error': str(e)}), 500
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()
