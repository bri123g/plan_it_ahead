from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.environ.get('DATABASE_URL'))

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE itinerary ADD COLUMN title VARCHAR(255)"))
    conn.commit()
    print("Successfully added title column to itinerary table")
