"""
Script per aggiornare i nomi comuni mancanti nel DB usando il mapping CIAG→nome
dal file resources/ciag.php.

Uso:
    cd backend
    python fix_comuni_nomi.py
"""
from __future__ import annotations

import re
import sys
import os

# Aggiungi il path di app
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models import Tariffa


def parse_ciag_php(php_path: str) -> dict[str, str]:
    """Legge resources/ciag.php e restituisce {codice_ciag: nome_comune}."""
    with open(php_path, encoding="utf-8") as f:
        content = f.read()

    # Cerca le entry tipo: "06020401" => "ABANO TERME",
    pattern = re.compile(r'"(\d{8})"\s*=>\s*"([^"]+)"')
    mapping = {}
    for m in pattern.finditer(content):
        codice = m.group(1)
        nome = m.group(2).strip()
        mapping[codice] = nome

    return mapping


def fix_comuni_nomi(dry_run: bool = False) -> None:
    php_path = os.path.join(
        os.path.dirname(__file__), "..", "resources", "ciag.php"
    )
    if not os.path.exists(php_path):
        print(f"[ERRORE] File non trovato: {php_path}")
        sys.exit(1)

    print(f"Leggo mapping CIAG da: {php_path}")
    ciag_map = parse_ciag_php(php_path)
    print(f"  → {len(ciag_map)} comuni nel mapping")

    db = SessionLocal()
    try:
        # Trova tutti i record con comune_nome vuoto ma comune_ciag valorizzato
        records = db.query(Tariffa).filter(
            Tariffa.comune_ciag.isnot(None),
            Tariffa.comune_ciag != "",
            (Tariffa.comune_nome.is_(None)) | (Tariffa.comune_nome == ""),
        ).all()

        print(f"Record con nome mancante e CIAG presente: {len(records)}")

        aggiornati = 0
        non_trovati: set[str] = set()

        for r in records:
            nome = ciag_map.get(r.comune_ciag)
            if nome:
                if not dry_run:
                    r.comune_nome = nome.title()  # "ABANO TERME" → "Abano Terme"
                aggiornati += 1
            else:
                non_trovati.add(r.comune_ciag)

        if not dry_run:
            db.commit()
            print(f"✅ Aggiornati {aggiornati} record")
        else:
            print(f"[DRY-RUN] Aggiornerei {aggiornati} record")

        if non_trovati:
            print(f"⚠️  {len(non_trovati)} codici CIAG non trovati nel mapping:")
            for c in sorted(non_trovati)[:20]:
                print(f"   - {c}")
            if len(non_trovati) > 20:
                print(f"   ... e altri {len(non_trovati) - 20}")

        # Riepilogo finale
        totale_senza_nome = db.query(Tariffa).filter(
            (Tariffa.comune_nome.is_(None)) | (Tariffa.comune_nome == "")
        ).count()
        print(f"\nRecord ancora senza nome nel DB: {totale_senza_nome}")

    finally:
        db.close()


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    if dry:
        print("=== DRY RUN (nessuna modifica al DB) ===\n")
    fix_comuni_nomi(dry_run=dry)
