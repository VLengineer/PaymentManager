from app.strategies.database import db_context

# Export get_db dependency for FastAPI
get_db = db_context.get_db

# Export other database utilities
engine = db_context.get_engine()
SessionLocal = db_context.get_session_local()
