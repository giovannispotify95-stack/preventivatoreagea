"""Quick smoke test: parse only a small number of rows from each file."""
from __future__ import annotations
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app", ".."))

from io import BytesIO
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.models import Base, Tariffa

engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
RESOURCES = os.path.join(os.path.dirname(__file__), "..", "resources")


def quick_test(label, parser_func, filename):
    db = Session()
    fpath = os.path.join(RESOURCES, filename)
    if not os.path.exists(fpath):
        print(f"  ⚠️  {fpath} non trovato"); return

    with open(fpath, "rb") as f:
        buf = BytesIO(f.read())

    t0 = time.time()
    try:
        count = parser_func(buf, db, anno=2026, versione=1)
        elapsed = time.time() - t0
        print(f"  ✅ {label}: {count} record in {elapsed:.1f}s")
        stats = db.query(Tariffa.garanzia, func.count()).filter(
            Tariffa.compagnia == label
        ).group_by(Tariffa.garanzia).all()
        for g, c in sorted(stats, key=lambda x: -x[1]):
            print(f"     {g}: {c}")
        sample = db.query(Tariffa).filter(Tariffa.compagnia == label).first()
        if sample:
            print(f"     Esempio: {sample.comune_nome} | {sample.specie_descrizione} | "
                  f"{sample.garanzia} ag={sample.tasso_agevolato} na={sample.tasso_non_agevolato}")
    except Exception as e:
        import traceback
        print(f"  ❌ {label}: {e}")
        traceback.print_exc()
    finally:
        db.close()


# --- REVO (smallest file ~4636 rows) ---
print("=" * 50)
print("REVO")
print("=" * 50)
from app.parsers.revo import parse_revo
quick_test("REVO", parse_revo, "Revo.xlsx")

# --- REALE MUTUA (~630 rows) ---
print("\n" + "=" * 50)
print("REALE MUTUA")
print("=" * 50)
from app.parsers.reale_mutua import parse_reale_mutua
quick_test("RealeMutua", parse_reale_mutua, "RealeMutua.xlsx")

# --- GENERALI (15k+ rows - biggest) ---
print("\n" + "=" * 50)
print("GENERALI")
print("=" * 50)
from app.parsers.generali import parse_generali
quick_test("Generali", parse_generali, "Generali.xlsx")
