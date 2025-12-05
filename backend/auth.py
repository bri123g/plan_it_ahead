from flask import Blueprint, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from sqlalchemy import Table, MetaData, select
from db_reflect import get_reflector

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def init_jwt(app):
    jwt = JWTManager(app)
    return jwt


@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    preferences = data.get('preferences')

    if not name or not email or not password:
        return jsonify({'msg': 'name, email and password required'}), 400

    ref = get_reflector()
    engine = ref['engine']
    metadata = MetaData()
    users = Table('users', metadata, autoload_with=engine)

    with engine.begin() as conn:
        existing = conn.execute(select(users).where(users.c.email == email)).first()
        if existing:
            return jsonify({'msg': 'user already exists'}), 400

        insert_values = {
            'name': name[:100] if name and len(name) > 100 else name,
            'email': email[:100] if email and len(email) > 100 else email,
            'password': password[:100] if len(password) > 100 else password
        }
        if preferences:
            insert_values['preferences'] = preferences

        result = conn.execute(users.insert().values(**insert_values))
        pk_val = result.inserted_primary_key[0] if result.inserted_primary_key else None
        
        if not pk_val:
            row = conn.execute(select(users).where(users.c.email == email)).first()
            if row:
                pk_val = row._mapping['user_id']

        created = conn.execute(select(users).where(users.c.user_id == pk_val)).first()
        if not created:
            return jsonify({'msg': 'failed to create user'}), 500

        user_dict = dict(created._mapping)
        access_token = create_access_token(
            {'user_id': user_dict['user_id']}, 
            expires_delta=timedelta(days=7)
        )
        return jsonify({'user': user_dict, 'access_token': access_token}), 201


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'msg': 'email and password required'}), 400

    ref = get_reflector()
    engine = ref['engine']
    metadata = MetaData()
    users = Table('users', metadata, autoload_with=engine)

    with engine.begin() as conn:
        row = conn.execute(select(users).where(users.c.email == email)).first()
        if not row:
            return jsonify({'msg': 'invalid credentials'}), 401

        stored_password = row._mapping.get('password')
        if not stored_password or stored_password != password:
            return jsonify({'msg': 'invalid credentials'}), 401

        user_dict = dict(row._mapping)
        access_token = create_access_token({'user_id': user_dict['user_id']})
        return jsonify({'user': user_dict, 'access_token': access_token}), 200


@bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    identity = get_jwt_identity() or {}
    user_id = identity.get('user_id')
    if not user_id:
        return jsonify({'msg': 'invalid token'}), 401

    ref = get_reflector()
    engine = ref['engine']
    metadata = MetaData()
    users = Table('users', metadata, autoload_with=engine)

    with engine.begin() as conn:
        row = conn.execute(select(users).where(users.c.user_id == user_id)).first()
        if not row:
            return jsonify({'msg': 'user not found'}), 404
        return jsonify({'user': dict(row._mapping)}), 200
