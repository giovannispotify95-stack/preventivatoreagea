"""
Parser per Generali.xlsx
Gestisce header multi-riga e struttura flat con garanzie frequenziali e catastrofali.
"""
from __future__ import annotations

import pandas as pd
import re
from typing import IO
from sqlalchemy.orm import Session
from app.models import Tariffa
from app.calcolo import TIPO_GARANZIA

# Mapping colonne Generali → garanzia normalizzata
COLONNE_GARANZIE = {
    "grandine": {
        "franchigia": ["grandine franchigia minima", "grandine fr minima"],
        "agevolato": ["grandine agevolato"],
        "non_agevolato": [
            "grandine integrativa non agevolato",
            "grandine non agevolato",
        ],
        "totale": ["grandine 2026", "grandine totale"],
    },
    "vento_forte": {
        "franchigia": ["vento forte franchigia minima", "vento forte fr minima"],
        "agevolato": ["vento forte agevolato"],
        "non_agevolato": ["vento forte non agevolato"],
        "totale": ["vento forte 2026", "vento forte totale"],
    },
    "eccesso_pioggia": {
        "franchigia": [
            "eccesso di pioggia franchigia minima",
            "eccesso pioggia fr minima",
            "eccesso di pioggia fr minima",
        ],
        "agevolato": [
            "eccesso di pioggia agevolato fr30",
            "eccesso di pioggia agevolato",
        ],
        "non_agevolato": [
            "eccesso di pioggia non agevolato",
            "eccesso di pioggia integrativa non agevolato",
        ],
        "totale": [
            "eccesso di pioggia 2026",
            "eccesso di pioggia totale",
        ],
    },
    "gelo_brina": {
        "franchigia": ["gelo/brina franchigia minima", "gelo brina fr minima"],
        "agevolato": ["gelo/brina agevolato", "gelo brina agevolato"],
        "non_agevolato": ["gelo/brina non agevolato", "gelo brina non agevolato"],
        "totale": ["gelo/brina 2026", "gelo brina totale"],
    },
    "siccita": {
        "franchigia": ["siccità franchigia minima", "siccita fr minima"],
        "agevolato": ["siccità agevolato", "siccita agevolato"],
        "non_agevolato": ["siccità non agevolato", "siccita non agevolato"],
        "totale": ["siccità 2026", "siccita totale"],
    },
    "alluvione": {
        "franchigia": ["alluvione franchigia minima", "alluvione fr minima"],
        "agevolato": ["alluvione agevolato"],
        "non_agevolato": ["alluvione non agevolato"],
        "totale": ["alluvione 2026", "alluvione totale"],
    },
    "eccesso_neve": {
        "franchigia": [
            "eccesso di neve franchigia minima",
            "eccesso neve fr minima",
        ],
        "agevolato": [
            "eccesso di neve agevolato fr30",
            "eccesso di neve agevolato",
        ],
        "non_agevolato": ["eccesso di neve non agevolato"],
        "totale": ["eccesso di neve 2026", "eccesso neve totale"],
    },
    "colpo_sole_vento_caldo": {
        "franchigia": [
            "colpo di sole / vento caldo franchigia minima",
            "colpo di sole/vento caldo fr minima",
        ],
        "agevolato": [
            "colpo di sole / vento caldo agevolato fr30",
            "colpo di sole/vento caldo agevolato",
        ],
        "non_agevolato": [
            "colpo di sole / vento caldo non agevolato",
            "colpo di sole/vento caldo non agevolato",
        ],
        "totale": [
            "colpo di sole / vento caldo 2026",
            "colpo di sole/vento caldo totale",
        ],
    },
    "sbalzo_termico": {
        "franchigia": [
            "sbalzo termico / ondata di calore franchigia minima",
            "sbalzo termico/ondata calore fr minima",
        ],
        "agevolato": [
            "sbalzo termico / ondata di calore agevolato fr30",
            "sbalzo termico/ondata calore agevolato",
        ],
        "non_agevolato": [
            "sbalzo termico / ondata di calore non agevolato",
            "sbalzo termico/ondata calore non agevolato",
        ],
        "totale": [
            "sbalzo termico / ondata di calore 2026",
            "sbalzo termico/ondata calore totale",
        ],
    },
}


def _normalizza_colonna(col: str) -> str:
    """Normalizza nome colonna: minuscolo, spazi singoli, no \n."""
    col = str(col).lower().strip()
    col = re.sub(r"\s+", " ", col)
    col = col.replace("\n", " ")
    return col


def _trova_colonna(cols_norm: list[str], possibili: list[str]) -> str | None:
    """Cerca tra le colonne normalizzate la prima corrispondenza."""
    for p in possibili:
        for c in cols_norm:
            if p in c:
                return c
    return None


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


def parse_generali(
    file: IO, db: Session, anno: int = 2026, versione: int = 1
) -> int:
    """
    Parsa il file Generali.xlsx e inserisce le tariffe nel database.
    Gestisce header multi-riga concatenando le prime righe.
    Restituisce il numero di record inseriti.
    """
    # Leggi le prime righe per ricostruire l'header multi-livello
    df_header = pd.read_excel(file, header=None, nrows=5, engine="openpyxl")

    # Determina quante righe di header ci sono (max 3)
    header_rows = 1
    for i in range(1, min(4, len(df_header))):
        row = df_header.iloc[i]
        non_null = row.notna().sum()
        if non_null > len(row) * 0.3:
            header_rows = i + 1

    # Ricostruisci nomi colonna concatenando le righe header
    col_names = []
    for col_idx in range(len(df_header.columns)):
        parts = []
        for row_idx in range(header_rows):
            val = df_header.iloc[row_idx, col_idx]
            if pd.notna(val):
                parts.append(str(val).strip())
        col_names.append(" ".join(parts) if parts else f"col_{col_idx}")

    # Rileggi il file saltando le righe header
    file.seek(0)
    df = pd.read_excel(
        file, header=None, skiprows=header_rows, engine="openpyxl"
    )
    df.columns = col_names[: len(df.columns)]

    # Normalizza nomi colonna
    col_map = {}
    for c in df.columns:
        col_map[_normalizza_colonna(c)] = c
    cols_norm = list(col_map.keys())

    # Identifica colonne chiave
    col_prov = _trova_colonna(cols_norm, ["provincia"])
    col_istat = _trova_colonna(cols_norm, ["cod. com. istat", "codice istat", "istat"])
    col_ciag = _trova_colonna(cols_norm, ["cod. com. ciag", "codice ciag", "ciag"])
    col_comune = _trova_colonna(cols_norm, ["comune"])
    col_specie_cod = _trova_colonna(
        cols_norm, ["cod. prod. ania", "codice prodotto", "cod prod"]
    )
    col_specie_desc = _trova_colonna(cols_norm, ["prodotto"])
    col_raggr = _trova_colonna(cols_norm, ["gruppo specie"])

    count = 0

    for _, row in df.iterrows():
        provincia = str(row.get(col_map.get(col_prov, ""), "")).strip() if col_prov else ""
        comune_istat = str(
            row.get(col_map.get(col_istat, ""), "")
        ).strip() if col_istat else ""
        comune_ciag = str(
            row.get(col_map.get(col_ciag, ""), "")
        ).strip() if col_ciag else ""
        comune_nome = str(
            row.get(col_map.get(col_comune, ""), "")
        ).strip() if col_comune else ""
        specie_cod = str(
            row.get(col_map.get(col_specie_cod, ""), "")
        ).strip() if col_specie_cod else ""
        specie_desc = str(
            row.get(col_map.get(col_specie_desc, ""), "")
        ).strip() if col_specie_desc else ""
        raggruppamento = str(
            row.get(col_map.get(col_raggr, ""), "")
        ).strip() if col_raggr else ""

        if not comune_istat or comune_istat == "nan":
            continue

        # Per ogni garanzia, estrai i tassi
        for garanzia_norm, campi in COLONNE_GARANZIE.items():
            col_fr = _trova_colonna(cols_norm, campi["franchigia"])
            col_ag = _trova_colonna(cols_norm, campi["agevolato"])
            col_na = _trova_colonna(cols_norm, campi["non_agevolato"])
            col_tot = _trova_colonna(cols_norm, campi["totale"])

            tasso_ag = _parse_float_it(
                row.get(col_map.get(col_ag, ""), 0)
            ) if col_ag else 0.0
            tasso_na = _parse_float_it(
                row.get(col_map.get(col_na, ""), 0)
            ) if col_na else 0.0
            tasso_tot = _parse_float_it(
                row.get(col_map.get(col_tot, ""), 0)
            ) if col_tot else 0.0
            franchigia = _parse_float_it(
                row.get(col_map.get(col_fr, ""), 0)
            ) if col_fr else 0.0

            # Salta se tutti i tassi sono zero
            if tasso_ag == 0.0 and tasso_na == 0.0 and tasso_tot == 0.0:
                continue

            if tasso_tot == 0.0:
                tasso_tot = round(tasso_ag + tasso_na, 4)

            tariffa = Tariffa(
                compagnia="Generali",
                provincia=provincia,
                comune_istat=comune_istat,
                comune_ciag=comune_ciag,
                comune_nome=comune_nome,
                specie_codice=specie_cod,
                specie_descrizione=specie_desc,
                raggruppamento=raggruppamento,
                garanzia=garanzia_norm,
                tipo_garanzia=TIPO_GARANZIA.get(garanzia_norm, "frequenziale"),
                franchigia_min=franchigia,
                franchigia_applicata=franchigia,
                tasso_agevolato=tasso_ag,
                tasso_non_agevolato=tasso_na,
                tasso_totale=tasso_tot,
                anno_validita=anno,
                versione_listino=versione,
            )
            db.add(tariffa)
            count += 1

    db.commit()
    return count
