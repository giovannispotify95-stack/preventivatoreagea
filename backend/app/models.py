"""
Modelli SQLAlchemy per il database unificato.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean
)
from app.database import Base


class Tariffa(Base):
    """Tabella unificata dei tassi per compagnia."""
    __tablename__ = "tariffe"

    id = Column(Integer, primary_key=True, autoincrement=True)
    compagnia = Column(String(50), nullable=False, index=True)
    provincia = Column(String(100), index=True)
    comune_istat = Column(String(20), index=True)
    comune_ciag = Column(String(20))
    comune_nome = Column(String(200))
    specie_codice = Column(String(20), index=True)
    specie_descrizione = Column(String(200))
    raggruppamento = Column(String(100))
    garanzia = Column(String(100), nullable=False, index=True)
    tipo_garanzia = Column(String(20), nullable=False)  # frequenziale | catastrofale
    franchigia_min = Column(Float)
    franchigia_applicata = Column(Float)
    tasso_agevolato = Column(Float, default=0.0)
    tasso_non_agevolato = Column(Float, default=0.0)
    tasso_totale = Column(Float, default=0.0)
    anno_validita = Column(Integer, default=2026)
    data_caricamento = Column(DateTime, default=datetime.utcnow)
    versione_listino = Column(Integer, default=1)


class PrezzoColtura(Base):
    """Tabella prezzi colture trasversale a tutte le compagnie."""
    __tablename__ = "prezzi_colture"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codice_ciag = Column(String(20), index=True)
    codice_ania = Column(String(20))
    codice_mipaaf = Column(String(20))
    descrizione = Column(String(200), index=True)
    varieta = Column(String(200))
    prezzo_consorzio = Column(Float)
    prezzo_ismea = Column(Float)
    prezzo_max = Column(Float)
    prezzo_med = Column(Float)
    prezzo_min = Column(Float)
    coeff_maggiorazione = Column(Float, default=1.0)
    standard_value_bio = Column(Float)
    anno = Column(Integer, default=2026)
    data_caricamento = Column(DateTime, default=datetime.utcnow)


class Preventivo(Base):
    """Storico preventivi generati (audit trail)."""
    __tablename__ = "preventivi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    data_creazione = Column(DateTime, default=datetime.utcnow)
    provincia = Column(String(100))
    comune_istat = Column(String(20))
    comune_nome = Column(String(200))
    coltura_codice = Column(String(20))
    coltura_descrizione = Column(String(200))
    superficie_ha = Column(Float)
    prezzo_unitario = Column(Float)
    capitale = Column(Float)
    regime = Column(String(20))  # agevolato | non_agevolato
    garanzie_selezionate = Column(Text)  # JSON string
    risultato_json = Column(Text)  # JSON completo del risultato
    note = Column(Text)


class VersioneListino(Base):
    """Storico versioni dei listini caricati."""
    __tablename__ = "versioni_listino"

    id = Column(Integer, primary_key=True, autoincrement=True)
    compagnia = Column(String(50), nullable=False)
    nome_file = Column(String(500))
    anno_validita = Column(Integer)
    data_caricamento = Column(DateTime, default=datetime.utcnow)
    num_record = Column(Integer, default=0)
    attivo = Column(Boolean, default=True)
    versione = Column(Integer, default=1)
