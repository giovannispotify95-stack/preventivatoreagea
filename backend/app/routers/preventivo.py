"""
API per il calcolo preventivo comparativo tra compagnie.
"""
from __future__ import annotations

import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import Tariffa, PrezzoColtura, Preventivo
from app.schemas import (
    PreventivoRequest,
    PreventivoResponse,
    PreventivoCompagnia,
    DettaglioGaranzia,
    GARANZIE_LABELS,
)
from app.calcolo import (
    valida_garanzie,
    calcola_contributo_agea,
    calcola_preventivo_compagnia,
    LABELS_GARANZIA,
    TIPO_GARANZIA,
    ALIQUOTA_IMPOSTA_PREMI,
    ALIQUOTA_CONSORZIO_DIFESA,
)

router = APIRouter(prefix="/api", tags=["Preventivo"])

COMPAGNIE = ["Generali", "REVO", "RealeMutua"]


@router.post("/calcola-preventivo", response_model=PreventivoResponse)
def calcola_preventivo(req: PreventivoRequest, db: Session = Depends(get_db)):
    """
    Calcola il preventivo comparativo per tutte e 3 le compagnie.
    """
    # Validazione garanzie
    garanzie_set = set(req.garanzie)
    errori = valida_garanzie(garanzie_set)
    if errori:
        raise HTTPException(status_code=422, detail={"errori_garanzie": errori})

    # Calcola capitale: superficie (Ha) × resa (q/Ha) × prezzo (€/q)
    capitale = round(req.superficie_ha * req.quintali_ha * req.prezzo_unitario, 2)

    # Trova info comune (dal primo record disponibile)
    comune_info = db.query(Tariffa).filter(
        Tariffa.comune_istat == req.comune_istat
    ).first()

    if not comune_info:
        # Prova con codice CIAG
        comune_info = db.query(Tariffa).filter(
            Tariffa.comune_ciag == req.comune_istat
        ).first()

    comune_nome = comune_info.comune_nome if comune_info else ""
    provincia = comune_info.provincia if comune_info else ""

    # Trova info coltura
    coltura = db.query(PrezzoColtura).filter(
        (PrezzoColtura.codice_ciag == req.coltura_codice)
        | (PrezzoColtura.codice_ania == req.coltura_codice)
    ).first()
    coltura_desc = coltura.descrizione if coltura else ""

    # Contributo AGEA
    perc_agea = calcola_contributo_agea(garanzie_set, req.regime)

    # Calcola per ogni compagnia
    risultati_compagnie = []

    for compagnia in COMPAGNIE:
        risultato = _calcola_per_compagnia(
            db, compagnia, req, garanzie_set, capitale
        )
        risultati_compagnie.append(risultato)

    # Determina il migliore (premio netto più basso tra quelli disponibili)
    disponibili = [
        r for r in risultati_compagnie if r.disponibile
    ]
    migliore = None
    if disponibili:
        migliore_comp = min(disponibili, key=lambda x: x.premio_netto)
        migliore = migliore_comp.compagnia

    # Salva preventivo nello storico
    preventivo_record = Preventivo(
        data_creazione=datetime.utcnow(),
        provincia=provincia,
        comune_istat=req.comune_istat,
        comune_nome=comune_nome,
        coltura_codice=req.coltura_codice,
        coltura_descrizione=coltura_desc,
        superficie_ha=req.superficie_ha,
        prezzo_unitario=req.prezzo_unitario,
        capitale=capitale,
        regime=req.regime,
        garanzie_selezionate=json.dumps(req.garanzie),
        risultato_json=json.dumps(
            [r.model_dump() for r in risultati_compagnie]
        ),
    )
    db.add(preventivo_record)
    db.commit()
    db.refresh(preventivo_record)

    return PreventivoResponse(
        comune_istat=req.comune_istat,
        comune_nome=comune_nome,
        provincia=provincia,
        coltura_codice=req.coltura_codice,
        coltura_descrizione=coltura_desc,
        superficie_ha=req.superficie_ha,
        quintali_ha=req.quintali_ha,
        prezzo_unitario=req.prezzo_unitario,
        capitale=capitale,
        regime=req.regime,
        garanzie_selezionate=req.garanzie,
        contributo_agea_perc=round(perc_agea * 100, 1),
        compagnie=risultati_compagnie,
        migliore=migliore,
        preventivo_id=preventivo_record.id,
    )


def _calcola_per_compagnia(
    db: Session,
    compagnia: str,
    req: PreventivoRequest,
    garanzie_set: set[str],
    capitale: float,
) -> PreventivoCompagnia:
    """Calcola il preventivo per una singola compagnia."""

    # Cerca tariffe per comune e coltura
    query = db.query(Tariffa).filter(
        and_(
            Tariffa.compagnia == compagnia,
            (Tariffa.comune_istat == req.comune_istat)
            | (Tariffa.comune_ciag == req.comune_istat),
        )
    )

    # Per RealeMutua filtra per tipo tariffa (versione_listino)
    if compagnia == "RealeMutua":
        from app.parsers.reale_mutua import VERSIONE_TARIFFA_NORMALE, VERSIONE_SCONTI
        ver = VERSIONE_SCONTI if req.tipo_tariffa_rm == "sconti" else VERSIONE_TARIFFA_NORMALE
        query = query.filter(Tariffa.versione_listino == ver)

    tariffe = query.all()

    # Filtra per codice specie se presente
    tariffe_filtrate = [
        t for t in tariffe
        if t.specie_codice == req.coltura_codice
        or t.specie_descrizione.upper() == req.coltura_codice.upper()
    ] if tariffe else []

    # Se non trovate per specie esatta, prova con tutte le tariffe del comune
    if not tariffe_filtrate:
        tariffe_filtrate = tariffe

    if not tariffe_filtrate:
        return PreventivoCompagnia(
            compagnia=compagnia,
            disponibile=False,
            messaggio=f"Nessuna tariffa trovata per {compagnia} "
                      f"per il comune/coltura selezionati.",
        )

    # Costruisci dati garanzie per il calcolo
    garanzie_dati = []
    for garanzia_nome in req.garanzie:
        tariffa_match = _trova_tariffa(
            tariffe_filtrate, garanzia_nome, req.franchigie.get(garanzia_nome)
        )

        if tariffa_match:
            garanzie_dati.append({
                "garanzia": garanzia_nome,
                "tipo": TIPO_GARANZIA.get(garanzia_nome, "frequenziale"),
                "franchigia": tariffa_match.franchigia_applicata or tariffa_match.franchigia_min or 0,
                "tasso_agevolato": tariffa_match.tasso_agevolato or 0.0,
                "tasso_non_agevolato": tariffa_match.tasso_non_agevolato or 0.0,
            })
        else:
            # Garanzia non disponibile per questa compagnia, tasso = 0
            garanzie_dati.append({
                "garanzia": garanzia_nome,
                "tipo": TIPO_GARANZIA.get(garanzia_nome, "frequenziale"),
                "franchigia": 0,
                "tasso_agevolato": 0.0,
                "tasso_non_agevolato": 0.0,
            })

    # Calcola preventivo
    risultato = calcola_preventivo_compagnia(
        garanzie_dati, capitale, garanzie_set, req.regime
    )

    # Converti in schema response
    dettaglio = [
        DettaglioGaranzia(
            garanzia=d["garanzia"],
            garanzia_label=d["garanzia_label"],
            tipo=d["tipo"],
            franchigia=d["franchigia"],
            tasso_agevolato=d["tasso_agevolato"],
            tasso_non_agevolato=d["tasso_non_agevolato"],
            premio_agevolato=d["premio_agevolato"],
            premio_non_agevolato=d["premio_non_agevolato"],
            subtotale=d["subtotale"],
        )
        for d in risultato["dettaglio_garanzie"]
    ]

    return PreventivoCompagnia(
        compagnia=compagnia,
        disponibile=True,
        dettaglio_garanzie=dettaglio,
        totale_agevolato=risultato["totale_agevolato"],
        totale_non_agevolato=risultato["totale_non_agevolato"],
        premio_lordo=risultato["premio_lordo"],
        perc_agea=risultato["perc_agea"],
        contributo_agea_eur=risultato["contributo_agea_eur"],
        imposta_premi_perc=risultato["imposta_premi_perc"],
        imposta_premi_eur=risultato["imposta_premi_eur"],
        consorzio_perc=risultato["consorzio_perc"],
        contributo_consorzio=risultato["contributo_consorzio"],
        premio_netto=risultato["premio_netto"],
    )


def _trova_tariffa(
    tariffe: list[Tariffa],
    garanzia: str,
    franchigia_richiesta: float | None,
) -> Tariffa | None:
    """
    Trova la tariffa migliore per garanzia e franchigia.
    Per RealeMutua sceglie la franchigia richiesta.
    """
    matching = [t for t in tariffe if t.garanzia == garanzia]

    if not matching:
        return None

    if franchigia_richiesta is not None:
        # Cerca la franchigia esatta
        exact = [
            t for t in matching
            if t.franchigia_applicata == franchigia_richiesta
        ]
        if exact:
            return exact[0]

    # Prendi la prima (franchigia minima)
    matching.sort(key=lambda t: t.franchigia_applicata or 0)
    return matching[0]


@router.get("/preventivi-storico")
def lista_preventivi(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Restituisce lo storico dei preventivi generati."""
    preventivi = (
        db.query(Preventivo)
        .order_by(Preventivo.data_creazione.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": p.id,
            "data_creazione": p.data_creazione.isoformat() if p.data_creazione else None,
            "provincia": p.provincia,
            "comune_nome": p.comune_nome,
            "coltura_descrizione": p.coltura_descrizione,
            "superficie_ha": p.superficie_ha,
            "capitale": p.capitale,
            "regime": p.regime,
            "garanzie": json.loads(p.garanzie_selezionate) if p.garanzie_selezionate else [],
        }
        for p in preventivi
    ]


@router.get("/preventivo/{preventivo_id}")
def dettaglio_preventivo(preventivo_id: int, db: Session = Depends(get_db)):
    """Restituisce il dettaglio completo di un preventivo salvato."""
    preventivo = db.query(Preventivo).filter(
        Preventivo.id == preventivo_id
    ).first()
    if not preventivo:
        raise HTTPException(status_code=404, detail="Preventivo non trovato.")

    return {
        "id": preventivo.id,
        "data_creazione": preventivo.data_creazione.isoformat() if preventivo.data_creazione else None,
        "provincia": preventivo.provincia,
        "comune_istat": preventivo.comune_istat,
        "comune_nome": preventivo.comune_nome,
        "coltura_codice": preventivo.coltura_codice,
        "coltura_descrizione": preventivo.coltura_descrizione,
        "superficie_ha": preventivo.superficie_ha,
        "prezzo_unitario": preventivo.prezzo_unitario,
        "capitale": preventivo.capitale,
        "regime": preventivo.regime,
        "garanzie_selezionate": json.loads(preventivo.garanzie_selezionate) if preventivo.garanzie_selezionate else [],
        "risultato": json.loads(preventivo.risultato_json) if preventivo.risultato_json else None,
    }
