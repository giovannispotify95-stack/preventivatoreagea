"""
Database configuration - SQLite per sviluppo locale, PostgreSQL per produzione.
"""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Path assoluto al DB nella directory backend/ indipendentemente dal CWD
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_DB = f"sqlite:///{_BACKEND_DIR / 'preventivatoreagea.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_DB)

# SQLite needs check_same_thread=False
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency injection per ottenere la sessione DB."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Crea tutte le tabelle nel database."""
    Base.metadata.create_all(bind=engine)
