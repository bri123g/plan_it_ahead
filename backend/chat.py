from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db_reflect import get_class, get_session
from datetime import datetime

bp = Blueprint('chat', __name__, url_prefix='/api/chat')


def _get_user_id():
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        return int(identity)
    except (ValueError, TypeError):
        return None


@bp.route('/conversations', methods=['GET'])
@jwt_required()
def list_conversations():
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    session = get_session()
    User = get_class('users')
    Conversation = get_class('conversation')
    Message = get_class('message')
    
    conversations = session.query(Conversation).filter(
        (getattr(Conversation, 'user1_id') == user_id) | (getattr(Conversation, 'user2_id') == user_id)
    ).all()
    
    conversations_list = []
    pk_col = list(User.__table__.primary_key)[0].name
    
    for conv in conversations:
        other_user_id = getattr(conv, 'user2_id') if getattr(conv, 'user1_id') == user_id else getattr(conv, 'user1_id')
        other_user = session.query(User).filter(getattr(User, pk_col) == other_user_id).first()
        
        last_message = None
        conv_id = getattr(conv, 'conversation_id')
        last_msg = session.query(Message).filter(
            getattr(Message, 'conversation_id') == conv_id
        ).order_by(getattr(Message, 'created_at').desc() if hasattr(Message, 'created_at') else None).first()
        
        if last_msg:
            last_message = {
                'content': getattr(last_msg, 'content', ''),
                'created_at': getattr(last_msg, 'created_at', '').isoformat() if hasattr(last_msg, 'created_at') and isinstance(getattr(last_msg, 'created_at'), datetime) else str(getattr(last_msg, 'created_at', ''))
            }
        
        conv_dict = {}
        for key in conv.__table__.columns.keys():
            value = getattr(conv, key)
            if isinstance(value, datetime):
                conv_dict[key] = value.isoformat()
            else:
                conv_dict[key] = value
        
        conv_dict['other_user'] = {
            'user_id': other_user_id,
            'name': getattr(other_user, 'name', 'Unknown') if other_user else 'Unknown',
            'email': getattr(other_user, 'email', '') if other_user else ''
        }
        conv_dict['last_message'] = last_message
        conversations_list.append(conv_dict)
    
    session.close()
    return jsonify({'conversations': conversations_list}), 200


@bp.route('/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    other_user_id = data.get('user_id')
    
    if not other_user_id:
        return jsonify({'msg': 'user_id required'}), 400

    session = get_session()
    Conversation = get_class('conversation')
    
    existing_conv = session.query(Conversation).filter(
        ((getattr(Conversation, 'user1_id') == user_id) & (getattr(Conversation, 'user2_id') == other_user_id)) |
        ((getattr(Conversation, 'user1_id') == other_user_id) & (getattr(Conversation, 'user2_id') == user_id))
    ).first()
    
    if existing_conv:
        conv_id = getattr(existing_conv, 'conversation_id')
        session.close()
        return jsonify({'msg': 'conversation already exists', 'conversation_id': conv_id}), 200
    
    conv_data = {
        'user1_id': min(user_id, other_user_id),
        'user2_id': max(user_id, other_user_id)
    }
    
    if hasattr(Conversation, 'created_at'):
        conv_data['created_at'] = datetime.utcnow()
    
    new_conv = Conversation(**conv_data)
    session.add(new_conv)
    session.commit()
    
    conv_id = getattr(new_conv, 'conversation_id', None)
    session.close()
    return jsonify({'msg': 'conversation created', 'conversation_id': conv_id}), 201


@bp.route('/conversations/<int:conversation_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(conversation_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    session = get_session()
    Conversation = get_class('conversation')
    Message = get_class('message')
    
    conv = session.query(Conversation).filter(
        getattr(Conversation, 'conversation_id') == conversation_id
    ).first()
    
    if not conv:
        session.close()
        return jsonify({'msg': 'conversation not found'}), 404
    
    if getattr(conv, 'user1_id') != user_id and getattr(conv, 'user2_id') != user_id:
        session.close()
        return jsonify({'msg': 'unauthorized'}), 403
    
    messages = session.query(Message).filter(
        getattr(Message, 'conversation_id') == conversation_id
    ).order_by(getattr(Message, 'created_at').asc() if hasattr(Message, 'created_at') else None).all()
    
    messages_list = []
    for msg in messages:
        msg_dict = {}
        for key in msg.__table__.columns.keys():
            value = getattr(msg, key)
            if isinstance(value, datetime):
                msg_dict[key] = value.isoformat()
            else:
                msg_dict[key] = value
        messages_list.append(msg_dict)
    
    session.close()
    return jsonify({'messages': messages_list}), 200


@bp.route('/conversations/<int:conversation_id>/messages', methods=['POST'])
@jwt_required()
def send_message(conversation_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'msg': 'content required'}), 400

    session = get_session()
    Conversation = get_class('conversation')
    Message = get_class('message')
    
    conv = session.query(Conversation).filter(
        getattr(Conversation, 'conversation_id') == conversation_id
    ).first()
    
    if not conv:
        session.close()
        return jsonify({'msg': 'conversation not found'}), 404
    
    if getattr(conv, 'user1_id') != user_id and getattr(conv, 'user2_id') != user_id:
        session.close()
        return jsonify({'msg': 'unauthorized'}), 403
    
    msg_data = {
        'conversation_id': conversation_id,
        'sender_id': user_id,
        'content': content
    }
    
    # Let the database set created_at with CURRENT_TIMESTAMP instead of UTC
    # This ensures the correct local time is used
    
    new_msg = Message(**msg_data)
    session.add(new_msg)
    session.commit()
    session.refresh(new_msg)  # Refresh to get the database-generated timestamp
    
    # Return the created message with its timestamp
    msg_dict = {}
    for key in new_msg.__table__.columns.keys():
        value = getattr(new_msg, key)
        if isinstance(value, datetime):
            msg_dict[key] = value.isoformat()
        else:
            msg_dict[key] = value
    
    session.close()
    return jsonify({'msg': 'message sent', 'message': msg_dict}), 201


@bp.route('/conversations/<int:conversation_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(conversation_id):
    user_id = _get_user_id()
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    session = get_session()
    Conversation = get_class('conversation')
    Message = get_class('message')
    
    conv = session.query(Conversation).filter(
        getattr(Conversation, 'conversation_id') == conversation_id
    ).first()
    
    if not conv:
        session.close()
        return jsonify({'msg': 'conversation not found'}), 404
    
    if getattr(conv, 'user1_id') != user_id and getattr(conv, 'user2_id') != user_id:
        session.close()
        return jsonify({'msg': 'unauthorized'}), 403
    
    unread_messages = session.query(Message).filter(
        getattr(Message, 'conversation_id') == conversation_id,
        getattr(Message, 'sender_id') != user_id,
        getattr(Message, 'read') == False if hasattr(Message, 'read') else None
    ).all()
    
    for msg in unread_messages:
        if hasattr(msg, 'read'):
            msg.read = True
        if hasattr(msg, 'read_at'):
            msg.read_at = datetime.utcnow()
    
    session.commit()
    session.close()
    return jsonify({'msg': 'marked as read', 'count': len(unread_messages)}), 200
