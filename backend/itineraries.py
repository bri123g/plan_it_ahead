from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db_reflect import get_class, get_session
from datetime import datetime, date, timedelta
import re


def _get_user_id():
    user_id = get_jwt_identity()
    if not user_id:
        return None
    try:
        return int(user_id)
    except (ValueError, TypeError):
        return None

bp = Blueprint('itineraries', __name__, url_prefix='/api/itineraries')


def _parse_datetime(s):
    if not s:
        return None
    try:
        # accept ISO format
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _timedelta_to_seconds(td):
    """Convert timedelta to total seconds (int) for JSON serialization, or None."""
    if td is None:
        return None
    if isinstance(td, timedelta):
        return int(td.total_seconds())
    return td


def _parse_iso_duration_to_minutes(s):
    """Parse ISO-8601 duration strings like 'PT31H40M' or 'PT13H20M' into integer minutes.
    Returns an int number of minutes, or None if it can't be parsed.
    Also accepts 'HH:MM' or numeric minute values as strings/ints.
    """
    if s is None:
        return None
    try:
        # already numeric
        if isinstance(s, (int, float)):
            return int(s)

        sval = str(s).strip()

        # ISO 8601 duration: PT#H#M#S
        m = re.match(r'^P(T)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$', sval)
        if m:
            hours = int(m.group(2)) if m.group(2) else 0
            minutes = int(m.group(3)) if m.group(3) else 0
            seconds = int(m.group(4)) if m.group(4) else 0
            total = hours * 60 + minutes + (seconds // 60)
            return int(total)

        # HH:MM or H:MM:SS
        if ':' in sval:
            parts = sval.split(':')
            if len(parts) >= 2:
                h = int(parts[0])
                mpart = int(parts[1])
                ssec = int(parts[2]) if len(parts) > 2 else 0
                return h * 60 + mpart + (ssec // 60)

        # plain number -> interpret as minutes
        if re.match(r'^\d+$', sval):
            return int(sval)

        return None
    except Exception:
        return None


@bp.route('', methods=['POST'])
@jwt_required()
def create_itinerary():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
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


@bp.route('/create-from-flights', methods=['POST'])
@jwt_required()
def create_itinerary_from_flights():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    departure_date_str = data.get('departure_date', '').strip()
    return_date_str = data.get('return_date', '').strip()
    title = data.get('title', '').strip()

    if not departure_date_str or not return_date_str:
        return jsonify({'msg': 'departure_date and return_date are required'}), 400

    try:
        departure_date = date.fromisoformat(departure_date_str)
        return_date = date.fromisoformat(return_date_str)
    except ValueError:
        return jsonify({'msg': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if return_date <= departure_date:
        return jsonify({'msg': 'return_date must be after departure_date'}), 400

    if not title:
        num_days = (return_date - departure_date).days
        title = f"Trip ({num_days} days)"

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        # Check if table has start_date and end_date columns
        if hasattr(Itinerary, 'start_date') and hasattr(Itinerary, 'end_date'):
            it = Itinerary(
                user_id=user_id,
                title=title,
                start_date=departure_date,
                end_date=return_date
            )
        elif hasattr(Itinerary, 'title'):
            # Fallback: use title if available
            it = Itinerary(user_id=user_id, title=title)
        else:
            # Basic fallback
            it = Itinerary(user_id=user_id)
        
        session.add(it)
        session.commit()

        # Get the itinerary ID (handle both 'id' and 'itinerary_id' column names)
        itinerary_id = getattr(it, 'itinerary_id', None) or getattr(it, 'id', None)

        num_days = (return_date - departure_date).days

        return jsonify({
            'itinerary_id': itinerary_id,
            'user_id': user_id,
            'title': title,
            'start_date': departure_date.isoformat(),
            'end_date': return_date.isoformat(),
            'num_days': num_days
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('', methods=['GET'])
@jwt_required()
def list_itineraries():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
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
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
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
    user_id = _get_user_id()
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
    user_id = _get_user_id()
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


@bp.route('/<int:itinerary_id>/time-slots', methods=['GET'])
@jwt_required()
def get_time_slots(itinerary_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        # Handle both 'itinerary_id' and 'id' column names
        itinerary_filter = {}
        if hasattr(Itinerary, 'itinerary_id'):
            itinerary_filter['itinerary_id'] = itinerary_id
        elif hasattr(Itinerary, 'id'):
            itinerary_filter['id'] = itinerary_id
        else:
            return jsonify({'msg': 'Cannot determine itinerary ID column'}), 500
        
        itinerary_filter['user_id'] = user_id
        it = session.query(Itinerary).filter_by(**itinerary_filter).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404

        # Get start and end dates
        start_date = None
        end_date = None
        if hasattr(it, 'start_date') and it.start_date:
            start_date = it.start_date if isinstance(it.start_date, date) else date.fromisoformat(str(it.start_date))
        if hasattr(it, 'end_date') and it.end_date:
            end_date = it.end_date if isinstance(it.end_date, date) else date.fromisoformat(str(it.end_date))

        if not start_date or not end_date:
            return jsonify({'msg': 'Itinerary must have start_date and end_date'}), 400

        num_days = (end_date - start_date).days + 1

        # Get existing items
        ItineraryItem = get_class('itinerary_item')
        items = session.query(ItineraryItem).filter_by(itinerary_id=itinerary_id).all()

        # Build items by day
        items_by_day = {}
        for item in items:
            day_num = getattr(item, 'day_number', 1)
            if day_num not in items_by_day:
                items_by_day[day_num] = []
            
            item_dict = {}
            for key in item.__table__.columns.keys():
                value = getattr(item, key)
                if isinstance(value, datetime):
                    item_dict[key] = value.isoformat()
                else:
                    item_dict[key] = value
            items_by_day[day_num].append(item_dict)

        # Generate 24-hour time slots for each day
        days = []
        for day_num in range(1, num_days + 1):
            slots = []
            for hour in range(24):
                slot_start = f"{hour:02d}:00"
                slot_end = f"{(hour + 1) % 24:02d}:00"
                
                # Find items in this time slot
                slot_items = []
                for item in items_by_day.get(day_num, []):
                    item_time = item.get('time', '')
                    if item_time:
                        try:
                            item_hour, item_min = map(int, item_time.split(':'))
                            if item_hour == hour:
                                slot_items.append(item)
                        except (ValueError, AttributeError):
                            pass
                
                slots.append({
                    'start': slot_start,
                    'end': slot_end,
                    'items': slot_items,
                    'occupied': len(slot_items) > 0
                })
            
            days.append({
                'day': day_num,
                'date': (start_date + timedelta(days=day_num - 1)).isoformat(),
                'slots': slots
            })

        return jsonify({
            'itinerary_id': itinerary_id,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'num_days': num_days,
            'days': days
        }), 200
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/budget', methods=['GET', 'POST'])
@jwt_required()
def calculate_budget(itinerary_id):
    """
    Returns basic budget info. Detailed breakdown should come from localStorage 
    (stored from /save response). This is a fallback for when localStorage is empty.
    """
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        total_budget = float(it.total_cost) if hasattr(it, 'total_cost') and it.total_cost else 0.0
        
        # Simple fallback breakdown - detailed breakdown comes from localStorage
        # which has the correct data from the /save endpoint
        breakdown = {
            'flights': total_budget,  # Assume all cost is flights as fallback
            'hotels': 0.0,
            'attractions': 0.0,
            'other': 0.0
        }
        
        return jsonify({
            'itinerary_id': itinerary_id,
            'total_budget': round(total_budget, 2),
            'breakdown': {k: round(float(v), 2) for k, v in breakdown.items()},
            'item_count': 0
        }), 200
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/items', methods=['GET'])
@jwt_required()
def get_itinerary_items(itinerary_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        # Items are stored in localStorage on frontend
        # Return empty list - frontend manages pending items
        return jsonify({'items': []}), 200
    finally:
        session.close()


def _check_time_conflict(items, day_number, start_time, duration_minutes):
    """Check if a time slot conflicts with existing items"""
    if not start_time or not duration_minutes:
        return None, None
    
    try:
        # Parse start time (HH:MM format)
        start_hour, start_min = map(int, start_time.split(':'))
        start_total_minutes = start_hour * 60 + start_min
        end_total_minutes = start_total_minutes + duration_minutes
        
        # Check against existing items on the same day
        for item in items:
            if item.get('day_number') != day_number:
                continue
            
            item_time = item.get('time', '')
            item_duration = item.get('duration_minutes', 0)
            
            if not item_time or not item_duration:
                continue
            
            try:
                item_hour, item_min = map(int, item_time.split(':'))
                item_start = item_hour * 60 + item_min
                item_end = item_start + item_duration
                
                # Check for overlap
                if not (end_total_minutes <= item_start or start_total_minutes >= item_end):
                    return {
                        'conflicts_with': item.get('item_name', 'Unknown'),
                        'conflict_time': item_time,
                        'conflict_duration': item_duration
                    }, item
            except (ValueError, AttributeError):
                continue
        
        return None, None
    except (ValueError, AttributeError):
        return None, None


@bp.route('/<int:itinerary_id>/items', methods=['POST'])
@jwt_required()
def add_itinerary_item(itinerary_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    item_type = data.get('item_type')  # 'attraction', 'hotel', 'flight'
    item_name = data.get('item_name', '')
    estimated_cost = data.get('estimated_cost', 0.0)

    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        # Items are stored temporarily in frontend localStorage
        # Return success - actual storage happens on save
        return jsonify({
            'item': {
                'itinerary_id': itinerary_id,
                'name': item_name,
                'item_type': item_type,
                'estimated_cost': estimated_cost
            }
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_itinerary_item(itinerary_id, item_id):
    user_id = _get_user_id()
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
    user_id = _get_user_id()
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


@bp.route('/<int:itinerary_id>/flights', methods=['POST'])
@jwt_required()
def add_flight_to_itinerary(itinerary_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    
    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        # Add flight to flights table
        try:
            Flight = get_class('flights')
            
            # Extract flight data with placeholder values for missing fields
            # Truncate flight_num to 20 chars max for database constraint
            raw_flight_num = data.get('flight_number', data.get('flight_id', 'N/A')) if data.get('flight_number', data.get('flight_id')) else 'N/A'
            flight_data = {
                'flight_num': str(raw_flight_num)[:20],
                'airline': data.get('airline', 'Unknown')[:50] if data.get('airline') else 'Unknown',
                'departure_time': data.get('departure_date', data.get('departure_time')),
                'arrival_time': data.get('arrival_date', data.get('arrival_time')),
                'from_city': data.get('origin_city', data.get('origin', 'Unknown'))[:50] if data.get('origin_city', data.get('origin')) else 'Unknown',
                'to_city': data.get('destination_city', data.get('destination', 'Unknown'))[:50] if data.get('destination_city', data.get('destination')) else 'Unknown',
                'from_airport': data.get('origin', 'N/A')[:10] if data.get('origin') else 'N/A',
                'to_airport': data.get('destination', 'N/A')[:10] if data.get('destination') else 'N/A',
                'price': float(data.get('price', 0)) if data.get('price') else 0.0,
            }
            
            # Handle class field (might be named differently)
            if hasattr(Flight, 'class_'):
                flight_data['class_'] = data.get('travel_class', data.get('cabin_class', 'Economy'))[:20]
            elif hasattr(Flight, 'flight_class'):
                flight_data['flight_class'] = data.get('travel_class', data.get('cabin_class', 'Economy'))[:20]
            
            duration_str = data.get('duration', '')
            if hasattr(Flight, 'duration'):
                duration_minutes = _parse_iso_duration_to_minutes(duration_str)
                # Store as integer minutes, not timedelta
                flight_data['duration'] = int(duration_minutes) if duration_minutes is not None else None
            
            flight = Flight(**flight_data)
            session.add(flight)
            session.commit()
            
            # Return flight info (convert timedelta to seconds for JSON serialization)
            flight_id = getattr(flight, 'flight_id', None) or getattr(flight, 'id', None)
            response_data = flight_data.copy()
            if 'duration' in response_data:
                response_data['duration'] = _timedelta_to_seconds(response_data['duration'])
            return jsonify({
                'flight': {
                    'flight_id': flight_id,
                    **response_data
                }
            }), 201
        except (RuntimeError, AttributeError) as e:
            return jsonify({'msg': f'flights table error: {str(e)}'}), 500
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/save', methods=['POST'])
@jwt_required()
def save_itinerary(itinerary_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    items = data.get('items', [])
    flights = data.get('flights', [])
    
    Itinerary = get_class('itinerary')
    session = get_session()
    try:
        it = session.query(Itinerary).filter_by(itinerary_id=itinerary_id, user_id=user_id).first()
        if not it:
            return jsonify({'msg': 'not found or unauthorized'}), 404
        
        total_cost = 0.0
        saved_items = []
        saved_flights = []
        breakdown = {
            'flights': 0.0,
            'hotels': 0.0,
            'attractions': 0.0,
            'other': 0.0
        }
        
        # Save flights to flights table (avoid duplicates)
        try:
            Flight = get_class('flights')

            # Precompute flight_num values for all incoming flights
            incoming_nums = []
            computed_records = []
            for flight_data in flights:
                raw_fnum = flight_data.get('flight_number', flight_data.get('flight_id', 'N/A'))
                fnum = str(raw_fnum)[:20]  # Truncate to 20 characters
                incoming_nums.append(fnum)
                computed_records.append((fnum, flight_data))

            # Query DB for any existing flight_nums to avoid duplicates
            existing_nums = set()
            try:
                col = getattr(Flight, 'flight_num')
                q = session.query(col).filter(col.in_(incoming_nums)).all()
                existing_nums = set([r[0] for r in q if r and r[0]])
            except Exception:
                existing_nums = set()

            added_nums = set()

            for fnum, flight_data in computed_records:
                price = float(flight_data.get('price', 0)) if flight_data.get('price') else 0.0
                total_cost += price
                breakdown['flights'] += price

                flight_record = {
                    'flight_num': fnum,
                    'airline': str(flight_data.get('airline', 'Unknown'))[:50],
                    'departure_time': flight_data.get('departure_date', flight_data.get('departure_time')),
                    'arrival_time': flight_data.get('arrival_date', flight_data.get('arrival_time')),
                    'from_city': str(flight_data.get('origin_city', flight_data.get('origin', 'Unknown')))[:50],
                    'to_city': str(flight_data.get('destination_city', flight_data.get('destination', 'Unknown')))[:50],
                    'from_airport': str(flight_data.get('origin', 'N/A'))[:10],
                    'to_airport': str(flight_data.get('destination', 'N/A'))[:10],
                    'price': price,
                }
                
                # Handle class field
                if hasattr(Flight, 'class_'):
                    flight_record['class_'] = str(flight_data.get('travel_class', 'Economy'))[:20]
                elif hasattr(Flight, 'flight_class'):
                    flight_record['flight_class'] = str(flight_data.get('travel_class', 'Economy'))[:20]

                if hasattr(Flight, 'duration'):
                    # Store duration as integer minutes, not timedelta
                    duration_minutes = _parse_iso_duration_to_minutes(flight_data.get('duration', ''))
                    flight_record['duration'] = int(duration_minutes) if duration_minutes is not None else None

                # Skip if DB already contains this flight_num or we've already added it in this batch
                if fnum in existing_nums or fnum in added_nums:
                    saved_flights.append(flight_record.copy())
                    continue

                try:
                    flight = Flight(**flight_record)
                    session.add(flight)
                    added_nums.add(fnum)
                    saved_flights.append(flight_record.copy())
                except Exception as e:
                    # If insertion fails, log and continue
                    print(f"Error adding flight record: {e}")
        except Exception as e:
            print(f"Error saving flights: {e}")
        
        for item in items:
            cost = float(item.get('price', item.get('estimated_cost', 0))) if item.get('price', item.get('estimated_cost')) else 0.0
            total_cost += cost
            item_type = item.get('type', item.get('item_type', 'other'))
            if isinstance(item_type, str):
                item_type = item_type.lower().strip()
            else:
                item_type = 'other'
            
            if item_type in ['hotel', 'hotels', 'accommodation']:
                breakdown['hotels'] += cost
            elif item_type in ['attraction', 'attractions', 'poi', 'point of interest']:
                breakdown['attractions'] += cost
            else:
                breakdown['other'] += cost
            
            saved_items.append({'name': item.get('name', 'Unknown'), 'cost': cost, 'type': item_type})
        
        if hasattr(it, 'total_cost'):
            it.total_cost = total_cost
        
        session.commit()
        
        return jsonify({
            'itinerary_id': itinerary_id,
            'total_cost': round(total_cost, 2),
            'breakdown': {k: round(v, 2) for k, v in breakdown.items()},
            'saved_flights': saved_flights,
            'saved_items': saved_items,
            'flight_count': len(saved_flights),
            'item_count': len(saved_items)
        }), 200
    except Exception as e:
        session.rollback()
        return jsonify({'msg': str(e)}), 400
    finally:
        session.close()


@bp.route('/<int:itinerary_id>/items/reorder', methods=['PUT'])
@jwt_required()
def reorder_itinerary_items(itinerary_id):
    user_id = _get_user_id()
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