from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# The connection string for the PostgreSQL database running in our local docker network
# Format: postgresql://user:password@hostname:port/database_name
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/paper_analyzer"
)

# Initialize the synchronous engine 
# (For a purely async architecture we would use AsyncEngine and asyncpg, 
# but for Phase 4 prototyping, standard psycopg2 is robust)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency generator yielding a database session for FastAPI routes.
    Ensures the session is cleanly closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
