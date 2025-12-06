from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()
engine = create_engine(os.environ.get('DATABASE_URL'))

with engine.connect() as conn:
    # Check database timezone
    result = conn.execute(text("SHOW TIMEZONE")).fetchone()
    print(f"Database timezone: {result[0]}")
    
    # Check current database time
    result = conn.execute(text("SELECT CURRENT_TIMESTAMP")).fetchone()
    print(f"Database current time: {result[0]}")
    
    # Check Python UTC time
    print(f"Python UTC time: {datetime.utcnow()}")
    
    # Check Python local time
    print(f"Python local time: {datetime.now()}")
