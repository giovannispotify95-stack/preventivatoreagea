"""Test script: verifica che i 3 parser leggano correttamente i file Excel."""
from __future__ import annotations

import sys
import os

# Aggiungi backend/ al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app", ".."))

from io import BytesIO
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Tariffa

# DB in-memory per test
engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

RESOURCES = os.path.join(os.path.dirname(__file__), "..", "resources")


def test_parser(name, parser_func, filename):
    db = Session()
    filepath = os.path.join(RESOURCES, filename)
    if not os.path.exists(filepath):
        print(f"  ⚠️  File non trovato: {filepath}")
        return
    with open(filepath, "rb") as f:
        buf = BytesIO(f.read())
    try:
        count = parser_func(buf, db, anno=2026, versione=1)
        print(f"  ✅ {name}: {count} record inseriti")
        # Mostra alcuni campioni
        samples = db.query(Tariffa).filter(Tariffa.compagnia == name).limit(3).all()
        for s in samples:
            print(f"     {s.comune_nome} | {s.specie_descrizione} | {s.garanzia} | ag={s.tasso_agevolato} na={s.tasso_non_agevolato} tot={s.tasso_totale} fr={s.franchigia_applicata}")
        # Conta per garanzia
        from sqlalchemy import func
        stats = db.query(Tariffa.garanzia, func.count()).filter(Tariffa.compagnia == name).group_by(Tariffa.garanzia).all()
        print(f"     Garanzie: {dict(stats)}")
    except Exception as e:
        print(f"  ❌ {name}: ERRORE — {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


print("=" * 60)
print("TEST PARSER GENERALI")
print("=" * 60)
from app.parsers.generali import parse_generali
test_parser("Generali", parse_generali, "Generali.xlsx")

print()
print("=" * 60)
print("TEST PARSER REVO")
print("=" * 60)
from app.parsers.revo import parse_revo
test_parser("REVO", parse_revo, "Revo.xlsx")

print()
print("=" * 60)
print("TEST PARSER REALE MUTUA")
print("=" * 60)
from app.parsers.reale_mutua import parse_reale_mutua
test_parser("RealeMutua", parse_reale_mutua, "RealeMutua.xlsx")
