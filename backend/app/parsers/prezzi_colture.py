"""
Parser per PrezziColture.xlsx
Prezzi assicurabili per ettaro, trasversale a tutte le compagnie.
"""
from __future__ import annotations

import pandas as pd
import re
from typing import IO
from sqlalchemy.orm import Session
from app.models import PrezzoColtura


def _parse_float_it(val) -> float:
    if pd.isna(val) or val == "" or val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _normalizza_colonna(col: str) -> str:
    col = str(col).lower().strip()
    col = re.sub(r"\s+", " ", col)
    return col


def _trova_col(cols_norm: list[str], possibili: list[str]) -> str | None:
    for p in possibili:
        for c in cols_norm:
            if p in c:
                return c
    return None


def parse_prezzi_colture(
    file: IO, db: Session, anno: int = 2026
) -> int:
    """
    Parsa PrezziColture.xlsx e inserisce i prezzi nel database.
    Restituisce il numero di record inseriti.
    """
    df = pd.read_excel(file, engine="openpyxl")
    cols_orig = list(df.columns)
    cols_norm = [_normalizza_colonna(c) for c in cols_orig]
    col_idx = {c: cols_orig[i] for i, c in enumerate(cols_norm)}

    col_ciag = _trova_col(cols_norm, ["ciag"])
    col_ania = _trova_col(cols_norm, ["ania"])
    col_mipaaf = _trova_col(cols_norm, ["mipaaf"])
    col_desc = _trova_col(cols_norm, ["descrizione"])
    col_var = _trova_col(cols_norm, ["varietà", "varieta"])
    col_consorzio = _trova_col(cols_norm, ["consorzio"])
    col_ismea = _trova_col(cols_norm, ["ismea"])
    col_max = _trova_col(cols_norm, ["max"])
    col_med = _trova_col(cols_norm, ["med"])
    col_min = _trova_col(cols_norm, ["min"])
    col_coeff = _trova_col(cols_norm, ["coefficiente maggiorazione", "coeff. magg", "coeff maggiorazione"])
    col_bio = _trova_col(cols_norm, ["standard value bio"])

    count = 0
    for _, row in df.iterrows():
        ciag = str(row.get(col_idx.get(col_ciag, ""), "")).strip() if col_ciag else ""
        desc = str(row.get(col_idx.get(col_desc, ""), "")).strip() if col_desc else ""

        if not ciag or ciag == "nan":
            continue

        prezzo = PrezzoColtura(
            codice_ciag=ciag,
            codice_ania=str(row.get(col_idx.get(col_ania, ""), "")).strip() if col_ania else "",
            codice_mipaaf=str(row.get(col_idx.get(col_mipaaf, ""), "")).strip() if col_mipaaf else "",
            descrizione=desc,
            varieta=str(row.get(col_idx.get(col_var, ""), "")).strip() if col_var else "",
            prezzo_consorzio=_parse_float_it(row.get(col_idx.get(col_consorzio, ""), 0)) if col_consorzio else None,
            prezzo_ismea=_parse_float_it(row.get(col_idx.get(col_ismea, ""), 0)) if col_ismea else None,
            prezzo_max=_parse_float_it(row.get(col_idx.get(col_max, ""), 0)) if col_max else None,
            prezzo_med=_parse_float_it(row.get(col_idx.get(col_med, ""), 0)) if col_med else None,
            prezzo_min=_parse_float_it(row.get(col_idx.get(col_min, ""), 0)) if col_min else None,
            coeff_maggiorazione=_parse_float_it(row.get(col_idx.get(col_coeff, ""), 1.0)) if col_coeff else 1.0,
            standard_value_bio=_parse_float_it(row.get(col_idx.get(col_bio, ""), 0)) if col_bio else None,
            anno=anno,
        )
        db.add(prezzo)
        count += 1

    db.commit()
    return count
