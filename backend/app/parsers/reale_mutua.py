"""
Parser per RealeMutua.xlsx
Gestisce struttura multi-franchigia: per ogni garanzia 4 livelli (10%, 15%, 20%, 30%),
ognuno con Tasso Intero, Agevolato e Non Agevolato.
"""
from __future__ import annotations
import pandas as pd
import re
from typing import IO
from sqlalchemy.orm import Session
from app.models import Tariffa
from app.calcolo import TIPO_GARANZIA

# Garanzie Reale Mutua con abbreviazione
GARANZIE_RM = {
    "gr": "grandine",
    "vf": "vento_forte",
    "ep": "eccesso_pioggia",
    "gb": "gelo_brina",
    "si": "siccita",
    "al": "alluvione",
    "en": "eccesso_neve",
    "cs-vc": "colpo_sole_vento_caldo",
    "st": "sbalzo_termico",
}

FRANCHIGIE_DISPONIBILI = [10, 15, 20, 30]


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
    col = col.replace("\n", " ")
    return col


def _is_near_zero(val: float) -> bool:
    """Verifica se un valore float è vicino a zero."""
    return abs(val) < 1e-9


def parse_reale_mutua(
    file: IO, db: Session, anno: int = 2026, versione: int = 1
) -> int:
    """
    Parsa il file RealeMutua.xlsx e inserisce le tariffe nel database.
    Per ogni garanzia e ogni livello di franchigia crea un record distinto.
    Restituisce il numero di record inseriti.
    """
    df = pd.read_excel(file, engine="openpyxl")
    cols_orig = list(df.columns)
    cols_norm = [_normalizza_colonna(c) for c in cols_orig]
    col_idx = {c: cols_orig[i] for i, c in enumerate(cols_norm)}

    # Colonne identificative
    col_istat = _trova_col(cols_norm, ["codice istat comune", "codice istat"])
    col_ciag = _trova_col(cols_norm, ["codice ciag comune", "codice ciag"])
    col_comune = _trova_col(cols_norm, ["descrizione comune"])
    col_specie_cod = _trova_col(cols_norm, ["codice specie"])
    col_specie_desc = _trova_col(cols_norm, ["descrizione specie"])
    col_fr_gr = _trova_col(cols_norm, ["fr minima gr"])
    col_fr_vf = _trova_col(cols_norm, ["fr minima vf"])
    col_fr_cat = _trova_col(cols_norm, ["fr minima cat"])

    count = 0

    for _, row in df.iterrows():
        comune_istat = str(
            row.get(col_idx.get(col_istat, ""), "")
        ).strip() if col_istat else ""
        comune_ciag = str(
            row.get(col_idx.get(col_ciag, ""), "")
        ).strip() if col_ciag else ""
        comune_nome = str(
            row.get(col_idx.get(col_comune, ""), "")
        ).strip() if col_comune else ""
        specie_cod = str(
            row.get(col_idx.get(col_specie_cod, ""), "")
        ).strip() if col_specie_cod else ""
        specie_desc = str(
            row.get(col_idx.get(col_specie_desc, ""), "")
        ).strip() if col_specie_desc else ""

        if not comune_istat or comune_istat == "nan":
            continue

        # Franchigie minime specifiche
        fr_min_gr = _parse_float_it(
            row.get(col_idx.get(col_fr_gr, ""), 0)
        ) if col_fr_gr else 0.0
        fr_min_vf = _parse_float_it(
            row.get(col_idx.get(col_fr_vf, ""), 0)
        ) if col_fr_vf else 0.0
        fr_min_cat = _parse_float_it(
            row.get(col_idx.get(col_fr_cat, ""), 0)
        ) if col_fr_cat else 0.0

        # Per ogni garanzia e ogni franchigia
        for abbr, garanzia_norm in GARANZIE_RM.items():
            fr_min = fr_min_gr
            if garanzia_norm == "vento_forte":
                fr_min = fr_min_vf
            elif TIPO_GARANZIA.get(garanzia_norm) == "catastrofale":
                fr_min = fr_min_cat

            for fr_pct in FRANCHIGIE_DISPONIBILI:
                records = _estrai_tasso_franchigia(
                    row, cols_norm, col_idx, abbr, fr_pct
                )
                if records is None:
                    continue

                tasso_intero, tasso_ag, tasso_na = records
                if _is_near_zero(tasso_ag) and _is_near_zero(tasso_na) and _is_near_zero(tasso_intero):
                    continue

                tariffa = Tariffa(
                    compagnia="RealeMutua",
                    provincia="",
                    comune_istat=comune_istat,
                    comune_ciag=comune_ciag,
                    comune_nome=comune_nome,
                    specie_codice=specie_cod,
                    specie_descrizione=specie_desc,
                    raggruppamento="",
                    garanzia=garanzia_norm,
                    tipo_garanzia=TIPO_GARANZIA.get(garanzia_norm, "frequenziale"),
                    franchigia_min=fr_min,
                    franchigia_applicata=float(fr_pct),
                    tasso_agevolato=tasso_ag,
                    tasso_non_agevolato=tasso_na,
                    tasso_totale=tasso_intero if tasso_intero > 0 else round(tasso_ag + tasso_na, 4),
                    anno_validita=anno,
                    versione_listino=versione,
                )
                db.add(tariffa)
                count += 1

    db.commit()
    return count


def _trova_col(cols_norm: list[str], possibili: list[str]) -> str | None:
    for p in possibili:
        for c in cols_norm:
            if p in c:
                return c
    return None


def _estrai_tasso_franchigia(
    row, cols_norm: list[str], col_idx: dict,
    abbr: str, fr_pct: int,
) -> tuple[float, float, float] | None:
    """
    Cerca le colonne per garanzia (abbr) e franchigia (fr_pct).
    Pattern colonne: "tasso {abbr} intero fr {fr_pct}%",
                     "tasso {abbr} agevolato fr {fr_pct}%",
                     "tasso {abbr} non agev fr {fr_pct}%"
    """
    patterns_intero = [
        f"tasso {abbr} intero fr {fr_pct}%",
        f"tasso {abbr} intero fr {fr_pct}",
        f"{abbr} intero fr {fr_pct}",
    ]
    patterns_ag = [
        f"tasso {abbr} agevolato fr {fr_pct}%",
        f"tasso {abbr} agevolato fr {fr_pct}",
        f"{abbr} agevolato fr {fr_pct}",
    ]
    patterns_na = [
        f"tasso {abbr} non agev fr {fr_pct}%",
        f"tasso {abbr} non agev fr {fr_pct}",
        f"tasso {abbr} non agevolato fr {fr_pct}",
        f"{abbr} non agev fr {fr_pct}",
    ]

    col_int = _trova_col(cols_norm, patterns_intero)
    col_ag = _trova_col(cols_norm, patterns_ag)
    col_na = _trova_col(cols_norm, patterns_na)

    if not col_ag and not col_na and not col_int:
        return None

    tasso_intero = _parse_float_it(
        row.get(col_idx.get(col_int, ""), 0)
    ) if col_int else 0.0
    tasso_ag = _parse_float_it(
        row.get(col_idx.get(col_ag, ""), 0)
    ) if col_ag else 0.0
    tasso_na = _parse_float_it(
        row.get(col_idx.get(col_na, ""), 0)
    ) if col_na else 0.0

    return (tasso_intero, tasso_ag, tasso_na)
