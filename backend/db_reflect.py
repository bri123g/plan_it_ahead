from sqlalchemy.ext.automap import automap_base
from sqlalchemy import create_engine, MetaData, Table, Column, Integer
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from flask import current_app

Base = automap_base()
_engine = None
_Session = None
_metadata = None
_manual_classes = {}


def init_reflector(app):
    """Initialize automap reflector using the app SQLALCHEMY_DATABASE_URI.
    Stores Base, engine and Session factory in app.extensions['db_reflector'].
    """
    global _engine, _Session, Base, _metadata, _manual_classes
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
    if not db_uri:
        raise RuntimeError('SQLALCHEMY_DATABASE_URI not configured')
    _engine = create_engine(db_uri)
    _metadata = MetaData()
    _metadata.reflect(bind=_engine)
    
    # Disable relationship generation to avoid backref conflicts
    def no_relationships(base, direction, return_fn, attrname, local_cls, referred_cls, **kw):
        return None
    
    # Prepare automap for tables with primary keys
    Base.prepare(_engine, reflect=True, generate_relationship=no_relationships)
    
    # Create manual mappings for tables without primary keys
    DeclarativeBase = declarative_base()
    
    for table_name in _metadata.tables:
        table = _metadata.tables[table_name]
        # Check if table has no primary key
        if not table.primary_key.columns:
            # Create a class manually with composite primary key or first column as key
            columns = list(table.columns)
            if columns:
                # Use all columns as composite primary key for tables without PK
                class_attrs = {'__tablename__': table_name, '__table__': table}
                # Create a new class dynamically
                new_class = type(table_name, (DeclarativeBase,), class_attrs)
                _manual_classes[table_name] = new_class
    
    _Session = sessionmaker(bind=_engine)
    app.extensions = getattr(app, 'extensions', {})
    app.extensions['db_reflector'] = {
        'engine': _engine, 
        'Base': Base, 
        'Session': _Session,
        'metadata': _metadata,
        'manual_classes': _manual_classes
    }
    return app.extensions['db_reflector']


def get_reflector():
    if not current_app:
        raise RuntimeError('No active Flask app')
    ref = current_app.extensions.get('db_reflector')
    if not ref:
        raise RuntimeError('db_reflector not initialized; call init_reflector(app) first')
    return ref


def get_class(name):
    """Return the mapped class for the given table name.
    Handles both automap classes and manually created classes for tables without PKs.
    """
    ref = get_reflector()
    Base = ref['Base']
    manual_classes = ref.get('manual_classes', {})
    
    # First try automap classes
    try:
        return getattr(Base.classes, name)
    except AttributeError:
        pass
    
    # Then try manual classes
    if name in manual_classes:
        return manual_classes[name]
    
        raise RuntimeError(f"Reflected class for table '{name}' not found")


def get_table(name):
    """Return the raw Table object for direct queries on tables without PKs."""
    ref = get_reflector()
    metadata = ref.get('metadata')
    if metadata and name in metadata.tables:
        return metadata.tables[name]
    raise RuntimeError(f"Table '{name}' not found in metadata")


def get_session():
    ref = get_reflector()
    Session = ref['Session']
    return Session()
