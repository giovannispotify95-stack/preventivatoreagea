"""
Motore di calcolo premio assicurativo agro-meteorologico.
Logica contributo AGEA, validazione garanzie, calcolo premio completo.
"""
from __future__ import annotations

from typing import Optional

# ── Costanti ─────────────────────────────────────────────────────────

ALIQUOTA_IMPOSTA_PREMI = 0.025       # 2,5% sul premio lordo
ALIQUOTA_CONSORZIO_DIFESA = 0.004    # 0,4% sul valore assicurato (capitale)

GRANDINE = "grandine"
VENTO_FORTE = "vento_forte"
ECCESSO_PIOGGIA = "eccesso_pioggia"

GARANZIE_FREQUENZIALI = {GRANDINE, VENTO_FORTE, ECCESSO_PIOGGIA}

GARANZIE_CATASTROFALI = {
    "gelo_brina", "siccita", "alluvione",
    "eccesso_neve", "colpo_sole_vento_caldo", "sbalzo_termico",
}

TUTTE_GARANZIE = GARANZIE_FREQUENZIALI | GARANZIE_CATASTROFALI

# Mapping nomi garanzia da ogni compagnia → nome normalizzato
MAPPING_GENERALI = {
    "grandine": "grandine",
    "vento forte": "vento_forte",
    "eccesso di pioggia": "eccesso_pioggia",
    "gelo brina": "gelo_brina",
    "gelo/brina": "gelo_brina",
    "siccità": "siccita",
    "siccita": "siccita",
    "alluvione": "alluvione",
    "eccesso di neve": "eccesso_neve",
    "colpo di sole/vento caldo": "colpo_sole_vento_caldo",
    "colpo di sole / vento caldo": "colpo_sole_vento_caldo",
    "sbalzo termico/ondata di calore": "sbalzo_termico",
    "sbalzo termico / ondata di calore": "sbalzo_termico",
}

MAPPING_REVO = {
    "grandine": "grandine",
    "vento forte": "vento_forte",
    "eccesso di pioggia": "eccesso_pioggia",
    "gelo/brina": "gelo_brina",
    "siccita'": "siccita",
    "siccità": "siccita",
    "alluvione": "alluvione",
    "alluvioni": "alluvione",
    "eccesso di neve": "eccesso_neve",
    "colpo di sole/vento caldo": "colpo_sole_vento_caldo",
    "sbalzo termico": "sbalzo_termico",
}

MAPPING_REALE_MUTUA = {
    "gr": "grandine",
    "vf": "vento_forte",
    "ep": "eccesso_pioggia",
    "gb": "gelo_brina",
    "si": "siccita",
    "al": "alluvione",
    "en": "eccesso_neve",
    "cs-vc": "colpo_sole_vento_caldo",
    "cs_vc": "colpo_sole_vento_caldo",
    "st": "sbalzo_termico",
}

LABELS_GARANZIA = {
    "grandine": "Grandine",
    "vento_forte": "Vento Forte",
    "eccesso_pioggia": "Eccesso di Pioggia",
    "gelo_brina": "Gelo / Brina",
    "siccita": "Siccità",
    "alluvione": "Alluvione",
    "eccesso_neve": "Eccesso di Neve",
    "colpo_sole_vento_caldo": "Colpo di Sole / Vento Caldo",
    "sbalzo_termico": "Sbalzo Termico / Ondata di Calore",
}

TIPO_GARANZIA = {
    "grandine": "frequenziale",
    "vento_forte": "frequenziale",
    "eccesso_pioggia": "frequenziale",
    "gelo_brina": "catastrofale",
    "siccita": "catastrofale",
    "alluvione": "catastrofale",
    "eccesso_neve": "catastrofale",
    "colpo_sole_vento_caldo": "catastrofale",
    "sbalzo_termico": "catastrofale",
}


def normalizza_garanzia(nome: str, compagnia: str) -> Optional[str]:
    """Normalizza il nome della garanzia al nome canonico interno."""
    nome_lower = nome.strip().lower()
    if compagnia.lower() == "generali":
        return MAPPING_GENERALI.get(nome_lower)
    elif compagnia.lower() == "revo":
        return MAPPING_REVO.get(nome_lower)
    elif compagnia.lower() in ("reale mutua", "realemutua", "reale_mutua"):
        return MAPPING_REALE_MUTUA.get(nome_lower)
    # Fallback: prova nel mapping Generali (più descrittivo)
    return MAPPING_GENERALI.get(nome_lower, nome_lower)


# ── Validazione Garanzie ─────────────────────────────────────────────

def valida_garanzie(garanzie: set[str]) -> list[str]:
    """
    Valida la combinazione di garanzie selezionate.
    Restituisce lista di errori (vuota se valida).
    """
    errori = []

    if GRANDINE not in garanzie:
        errori.append("La garanzia Grandine è obbligatoria.")
        return errori

    if VENTO_FORTE in garanzie and GRANDINE not in garanzie:
        errori.append("Vento Forte richiede la presenza di Grandine.")

    if ECCESSO_PIOGGIA in garanzie and not {GRANDINE, VENTO_FORTE}.issubset(garanzie):
        errori.append(
            "Eccesso di Pioggia richiede Grandine + Vento Forte."
        )

    catastrofali_selezionate = garanzie & GARANZIE_CATASTROFALI
    if catastrofali_selezionate:
        pacchetto_freq = {GRANDINE, VENTO_FORTE, ECCESSO_PIOGGIA}
        if not pacchetto_freq.issubset(garanzie):
            errori.append(
                "Le garanzie catastrofali richiedono il pacchetto "
                "frequenziale completo (Grandine + Vento Forte + Eccesso di Pioggia)."
            )

    # Verifica che tutte le garanzie siano riconosciute
    sconosciute = garanzie - TUTTE_GARANZIE
    if sconosciute:
        errori.append(f"Garanzie non riconosciute: {', '.join(sconosciute)}")

    return errori


# ── Calcolo Contributo AGEA ──────────────────────────────────────────

def calcola_contributo_agea(garanzie: set[str], regime: str) -> float:
    """
    Calcola la percentuale di contributo AGEA in base alle garanzie e regime.
    Restituisce un valore tra 0.0 e 0.70 (70%).
    """
    if regime != "agevolato":
        return 0.0

    ha_catastrofali = bool(garanzie & GARANZIE_CATASTROFALI)
    ha_pacchetto_completo = {
        GRANDINE, VENTO_FORTE, ECCESSO_PIOGGIA
    }.issubset(garanzie)

    if ha_pacchetto_completo and ha_catastrofali:
        return 0.70
    elif ha_pacchetto_completo:
        return 0.62
    elif {GRANDINE, VENTO_FORTE}.issubset(garanzie):
        return 0.48
    return 0.0


def descrizione_agea(perc: float) -> str:
    """Restituisce la descrizione testuale del livello AGEA."""
    if perc >= 0.70:
        return "Pacchetto Frequenziale completo + almeno 1 garanzia Catastrofale"
    elif perc >= 0.62:
        return "Pacchetto Frequenziale completo (Grandine + Vento Forte + Eccesso di Pioggia)"
    elif perc >= 0.48:
        return "Grandine + Vento Forte"
    return "Nessun contributo AGEA applicabile"


# ── Calcolo Premio Completo ──────────────────────────────────────────

def calcola_preventivo_compagnia(
    tariffe_garanzie: list[dict],
    capitale: float,
    garanzie_selezionate: set[str],
    regime: str,
) -> dict:
    """
    Calcola il preventivo per una singola compagnia.

    tariffe_garanzie: lista di dict con:
        { "garanzia": str (normalizzato), "tipo": str,
          "franchigia": float, "tasso_agevolato": float,
          "tasso_non_agevolato": float }
    capitale: Prezzo_coltura × Superficie (valore assicurato totale)
    garanzie_selezionate: set di nomi normalizzati delle garanzie scelte
    regime: "agevolato" o "non_agevolato"
    """
    totale_agevolato = 0.0
    totale_non_agevolato = 0.0
    dettaglio = []

    for t in tariffe_garanzie:
        p_agev = round(capitale * t["tasso_agevolato"] / 100, 2)
        p_non_agev = round(capitale * t["tasso_non_agevolato"] / 100, 2)
        totale_agevolato += p_agev
        totale_non_agevolato += p_non_agev
        dettaglio.append({
            "garanzia": t["garanzia"],
            "garanzia_label": LABELS_GARANZIA.get(t["garanzia"], t["garanzia"]),
            "tipo": t["tipo"],
            "franchigia": t.get("franchigia", 0),
            "tasso_agevolato": t["tasso_agevolato"],
            "tasso_non_agevolato": t["tasso_non_agevolato"],
            "premio_agevolato": p_agev,
            "premio_non_agevolato": p_non_agev,
            "subtotale": round(p_agev + p_non_agev, 2),
        })

    premio_lordo = round(totale_agevolato + totale_non_agevolato, 2)
    perc_agea = calcola_contributo_agea(garanzie_selezionate, regime)
    contributo_agea = round(totale_agevolato * perc_agea, 2)
    imposta_premi = round(premio_lordo * ALIQUOTA_IMPOSTA_PREMI, 2)
    contributo_consorzio = round(capitale * ALIQUOTA_CONSORZIO_DIFESA, 2)
    premio_netto = round(
        premio_lordo - contributo_agea + imposta_premi + contributo_consorzio, 2
    )

    return {
        "dettaglio_garanzie": dettaglio,
        "totale_agevolato": round(totale_agevolato, 2),
        "totale_non_agevolato": round(totale_non_agevolato, 2),
        "premio_lordo": premio_lordo,
        "perc_agea": round(perc_agea * 100, 1),
        "contributo_agea_eur": contributo_agea,
        "imposta_premi_perc": ALIQUOTA_IMPOSTA_PREMI * 100,
        "imposta_premi_eur": imposta_premi,
        "consorzio_perc": ALIQUOTA_CONSORZIO_DIFESA * 100,
        "contributo_consorzio": contributo_consorzio,
        "premio_netto": premio_netto,
    }
