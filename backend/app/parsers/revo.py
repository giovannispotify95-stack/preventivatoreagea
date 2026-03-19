"""
Parser per REVO.xlsx
Sheet 1: Garanzie Frequenziali per Provincia/Comune/Specie
Sheet 2: Garanzie Catastrofali per Raggruppamento coltura
"""
from __future__ import annotations
import pandas as pd
import re
from typing import IO
from sqlalchemy.orm import Session
from app.models import Tariffa
from app.calcolo import TIPO_GARANZIA, normalizza_garanzia


def _parse_float_it(val) -> float:
    """Converte valore con virgola italiana in float."""
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


def _parse_sheet_frequenziali(
    file: IO, db: Session, anno: int, versione: int
) -> int:
    """
    Parsa Sheet 1 di REVO: garanzie frequenziali per Provincia/Comune/Specie.
    Struttura ripetuta: GARANZIA | Franchigia Min | Tasso Agev | Tasso Non Agev
    """
    df = pd.read_excel(file, sheet_name=0, engine="openpyxl")
    cols = [_normalizza_colonna(c) for c in df.columns]
    df.columns = cols

    # Individua colonne chiave
    col_prov = next((c for c in cols if "provincia" in c), None)
    col_cod_comune = next(
        (c for c in cols if "codice comune" in c or "cod comune" in c), None
    )
    col_comune = next(
        (c for c in cols if c == "comune" or c.endswith("comune")), None
    )
    col_raggr = next((c for c in cols if "raggruppamento" in c), None)
    col_specie_cod = next(
        (c for c in cols if "codice specie" in c or "cod specie" in c), None
    )
    col_specie = next(
        (c for c in cols if c == "specie" or c.endswith("specie")), None
    )

    # Individua blocchi garanzia ripetuti
    # Cerca pattern: GARANZIA poi "franchigia min" poi "tasso agevolato" poi "tasso non agevolato"
    garanzie_blocchi = []
    garanzia_corrente = None
    i = 0
    while i < len(cols):
        c = cols[i]
        if c in ("grandine", "vento forte", "eccesso di pioggia"):
            garanzia_corrente = normalizza_garanzia(c, "revo")
            # I prossimi 3 campi sono franchigia, agevolato, non agevolato
            fr_col = cols[i + 1] if i + 1 < len(cols) else None
            ag_col = cols[i + 2] if i + 2 < len(cols) else None
            na_col = cols[i + 3] if i + 3 < len(cols) else None
            garanzie_blocchi.append({
                "garanzia": garanzia_corrente,
                "col_garanzia": c,
                "col_franchigia": fr_col,
                "col_agevolato": ag_col,
                "col_non_agevolato": na_col,
            })
            i += 4
            continue
        # Fallback: cerca blocchi per pattern di colonne con nome garanzia
        for nome_revo in [
            "grandine", "vento forte", "eccesso di pioggia",
        ]:
            if nome_revo in c and "franchigia" not in c and "tasso" not in c:
                garanzia_corrente = normalizza_garanzia(nome_revo, "revo")
                break
        i += 1

    # Se non trovati blocchi strutturati, prova parsing per colonne con pattern
    if not garanzie_blocchi:
        garanzie_blocchi = _identifica_blocchi_fallback(cols)

    count = 0
    for _, row in df.iterrows():
        provincia = str(row.get(col_prov, "")).strip() if col_prov else ""
        cod_comune = str(row.get(col_cod_comune, "")).strip() if col_cod_comune else ""
        comune_nome = str(row.get(col_comune, "")).strip() if col_comune else ""
        raggruppamento = str(row.get(col_raggr, "")).strip() if col_raggr else ""
        specie_cod = str(row.get(col_specie_cod, "")).strip() if col_specie_cod else ""
        specie_desc = str(row.get(col_specie, "")).strip() if col_specie else ""

        if not cod_comune or cod_comune == "nan":
            continue

        for blocco in garanzie_blocchi:
            fr = _parse_float_it(row.get(blocco["col_franchigia"], 0))
            ag = _parse_float_it(row.get(blocco["col_agevolato"], 0))
            na = _parse_float_it(row.get(blocco["col_non_agevolato"], 0))

            if ag == 0.0 and na == 0.0:
                continue

            tariffa = Tariffa(
                compagnia="REVO",
                provincia=provincia,
                comune_istat="",  # REVO usa codice CIAG, mapping necessario
                comune_ciag=cod_comune,
                comune_nome=comune_nome,
                specie_codice=specie_cod,
                specie_descrizione=specie_desc,
                raggruppamento=raggruppamento,
                garanzia=blocco["garanzia"],
                tipo_garanzia=TIPO_GARANZIA.get(blocco["garanzia"], "frequenziale"),
                franchigia_min=fr,
                franchigia_applicata=fr,
                tasso_agevolato=ag,
                tasso_non_agevolato=na,
                tasso_totale=round(ag + na, 4),
                anno_validita=anno,
                versione_listino=versione,
            )
            db.add(tariffa)
            count += 1

    return count


def _identifica_blocchi_fallback(cols: list[str]) -> list[dict]:
    """Fallback: identifica blocchi garanzia per pattern colonne."""
    blocchi = []
    garanzie_names = {
        "grandine": "grandine",
        "vento forte": "vento_forte",
        "eccesso di pioggia": "eccesso_pioggia",
    }
    for nome, norm in garanzie_names.items():
        fr_col = next(
            (c for c in cols if nome in c and "franchigia" in c), None
        )
        ag_col = next(
            (c for c in cols if nome in c and "agevolato" in c and "non" not in c),
            None,
        )
        na_col = next(
            (c for c in cols if nome in c and "non agevolato" in c), None
        )
        if ag_col or na_col:
            blocchi.append({
                "garanzia": norm,
                "col_garanzia": nome,
                "col_franchigia": fr_col,
                "col_agevolato": ag_col,
                "col_non_agevolato": na_col,
            })
    return blocchi


def _parse_sheet_catastrofali(
    file: IO, db: Session, anno: int, versione: int
) -> int:
    """
    Parsa Sheet 2 di REVO: garanzie catastrofali per Raggruppamento coltura.
    Struttura: Raggruppamento | GARANZIA | Franchigia Min | Tasso Agev | Tasso Non Agev
    """
    try:
        df = pd.read_excel(file, sheet_name=1, engine="openpyxl")
    except (ValueError, IndexError):
        return 0

    cols = [_normalizza_colonna(c) for c in df.columns]
    df.columns = cols

    col_raggr = next((c for c in cols if "raggruppamento" in c), cols[0] if cols else None)
    col_garanzia = next((c for c in cols if "garanzia" in c), cols[1] if len(cols) > 1 else None)
    col_fr = next((c for c in cols if "franchigia" in c), None)
    col_ag = next(
        (c for c in cols if "agevolato" in c and "non" not in c), None
    )
    col_na = next((c for c in cols if "non agevolato" in c), None)

    count = 0
    for _, row in df.iterrows():
        raggruppamento = str(row.get(col_raggr, "")).strip() if col_raggr else ""
        garanzia_raw = str(row.get(col_garanzia, "")).strip() if col_garanzia else ""

        if not garanzia_raw or garanzia_raw == "nan":
            continue

        garanzia_norm = normalizza_garanzia(garanzia_raw, "revo")
        if not garanzia_norm or garanzia_norm not in TIPO_GARANZIA:
            # Potrebbe essere un nome come "TAB D EXTRA Q" → skip
            continue

        fr = _parse_float_it(row.get(col_fr, 0)) if col_fr else 0.0
        ag = _parse_float_it(row.get(col_ag, 0)) if col_ag else 0.0
        na = _parse_float_it(row.get(col_na, 0)) if col_na else 0.0

        if ag == 0.0 and na == 0.0:
            continue

        tariffa = Tariffa(
            compagnia="REVO",
            provincia="",
            comune_istat="",
            comune_ciag="",
            comune_nome="",
            specie_codice="",
            specie_descrizione="",
            raggruppamento=raggruppamento,
            garanzia=garanzia_norm,
            tipo_garanzia=TIPO_GARANZIA.get(garanzia_norm, "catastrofale"),
            franchigia_min=fr,
            franchigia_applicata=fr,
            tasso_agevolato=ag,
            tasso_non_agevolato=na,
            tasso_totale=round(ag + na, 4),
            anno_validita=anno,
            versione_listino=versione,
        )
        db.add(tariffa)
        count += 1

    return count


def parse_revo(
    file: IO, db: Session, anno: int = 2026, versione: int = 1
) -> int:
    """
    Parsa entrambi i sheet del file REVO.xlsx.
    Restituisce il numero totale di record inseriti.
    """
    count_freq = _parse_sheet_frequenziali(file, db, anno, versione)
    file.seek(0)
    count_cat = _parse_sheet_catastrofali(file, db, anno, versione)
    db.commit()
    return count_freq + count_cat
