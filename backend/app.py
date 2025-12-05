from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)

# CORS configuration - allow all origins in development, restrict in production
# Update origins list with your frontend URL when deploying
allowed_origins = os.getenv('CORS_ORIGINS', '*').split(',')
CORS(app, origins=allowed_origins if allowed_origins != ['*'] else ['*'])

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

# Database configuration - connect to provided DATABASE_URL or fallback to local sqlite
db_url = os.getenv('DATABASE_URL', 'sqlite:///planit.db')
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', app.config['SECRET_KEY'])

from models import db
from auth import bp as auth_bp, init_jwt
from db_reflect import init_reflector
from itineraries import bp as itineraries_bp
from search import bp as search_bp
from ai_itinerary import bp as ai_bp
from matching import bp as matching_bp
from chat import bp as chat_bp

# Initialize extensions
db.init_app(app)
jwt = init_jwt(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(itineraries_bp)
app.register_blueprint(search_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(matching_bp)
app.register_blueprint(chat_bp)

# Initialize automap reflector (will reflect existing Postgres tables)
try:
    init_reflector(app)
except Exception:
    # If reflection fails (e.g. DATABASE_URL not set), don't crash at import time.
    # The reflector will be initialized when the app runs and DATABASE_URL is available.
    pass


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return {'status': 'ok', 'message': 'Flask backend is running'}, 200


@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint"""
    return {'message': 'Backend is working!'}, 200


def ensure_db():
    # Create tables if they don't exist. In production use migrations.
    with app.app_context():
        db.create_all()


if __name__ == '__main__':
    # Only auto-create tables for the local SQLite development DB.
    # Do NOT run create_all() against an existing Postgres database —
    # your DBeaver schema is authoritative and running create_all()
    # caused foreign key / column mismatches.
    db_url = app.config.get('SQLALCHEMY_DATABASE_URI', '') or ''
    if 'sqlite' in db_url:
        ensure_db()
    else:
        # Skip automatic table creation for Postgres. Use migrations or reflection.
        pass

    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])


