from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.environ.get('DATABASE_URL'))
inspector = inspect(engine)
cols = inspector.get_columns('message')

print('Message table columns:')
for col in cols:
    print(f"  {col['name']}: {col['type']} (default: {col.get('default', 'None')})")
