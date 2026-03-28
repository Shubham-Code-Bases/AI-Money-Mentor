from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import json

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost/aimoneymentor")

# Create engine. Incase mysql server is not running, we'll try/except to prevent total app crash on startup.
try:
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()

    class UserProfile(Base):
        __tablename__ = "user_profiles"

        id = Column(Integer, primary_key=True, index=True)
        name = Column(String(255), nullable=True)
        income = Column(Float, default=0.0)
        goals = Column(Text) # Store as JSON string
        risk_level = Column(String(50), default="Moderate")
        target_retirement_age = Column(Integer, default=50)
        current_savings = Column(Float, default=0.0)

    # Create tables
    Base.metadata.create_all(bind=engine)
    DB_AVAILABLE = True

except Exception as e:
    print(f"Database connection failed: {e}")
    print("Continuing with in-memory fallback. Please ensure MySQL is running if you want DB persistence.")
    DB_AVAILABLE = False
    SessionLocal = None

def get_db():
    if not DB_AVAILABLE:
        yield None
        return
        
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
