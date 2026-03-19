"""
API per ricerca comuni, colture e tariffe disponibili.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import distinct, func

from app.database import get_db
from app.models import Tariffa, PrezzoColtura
from app.schemas import ComuneResult, ColturaResult, TariffaDisponibile

router = APIRouter(prefix="/api", tags=["Ricerca"])


@router.get("/comuni", response_model=list[ComuneResult])
def cerca_comuni(
    q: str = Query("", min_length=0, description="Ricerca per nome, ISTAT o CIAG"),
    provincia: str = Query("", description="Filtro per provincia"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """Cerca comuni disponibili nel database tariffe."""
    query = db.query(
        Tariffa.comune_istat,
        Tariffa.comune_nome,
        Tariffa.provincia,
        Tariffa.comune_ciag,
    ).distinct()

    if q:
        q_like = f"%{q}%"
        query = query.filter(
            (Tariffa.comune_nome.ilike(q_like))
            | (Tariffa.comune_istat.ilike(q_like))
            | (Tariffa.comune_ciag.ilike(q_like))
        )

    if provincia:
        query = query.filter(Tariffa.provincia.ilike(f"%{provincia}%"))

    results = query.limit(limit).all()

    return [
        ComuneResult(
            comune_istat=r.comune_istat or "",
            comune_nome=r.comune_nome or "",
            provincia=r.provincia or "",
            comune_ciag=r.comune_ciag,
        )
        for r in results
        if r.comune_istat
    ]


@router.get("/province")
def lista_province(db: Session = Depends(get_db)):
    """Restituisce la lista delle province disponibili."""
    results = (
        db.query(distinct(Tariffa.provincia))
        .filter(Tariffa.provincia.isnot(None))
        .filter(Tariffa.provincia != "")
        .order_by(Tariffa.provincia)
        .all()
    )
    return [r[0] for r in results]


@router.get("/colture", response_model=list[ColturaResult])
def cerca_colture(
    q: str = Query("", min_length=0, description="Ricerca per nome o codice"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """Cerca colture disponibili con prezzi."""
    query = db.query(PrezzoColtura)

    if q:
        q_like = f"%{q}%"
        query = query.filter(
            (PrezzoColtura.descrizione.ilike(q_like))
            | (PrezzoColtura.codice_ciag.ilike(q_like))
            | (PrezzoColtura.codice_ania.ilike(q_like))
        )

    results = query.limit(limit).all()

    return [
        ColturaResult(
            codice_ciag=r.codice_ciag or "",
            codice_ania=r.codice_ania,
            descrizione=r.descrizione or "",
            varieta=r.varieta,
            prezzo_ismea=r.prezzo_ismea,
            prezzo_max=r.prezzo_max,
            prezzo_med=r.prezzo_med,
            prezzo_min=r.prezzo_min,
        )
        for r in results
    ]


@router.get("/raggruppamenti")
def lista_raggruppamenti(db: Session = Depends(get_db)):
    """Restituisce i raggruppamenti coltura disponibili."""
    results = (
        db.query(distinct(Tariffa.raggruppamento))
        .filter(Tariffa.raggruppamento.isnot(None))
        .filter(Tariffa.raggruppamento != "")
        .order_by(Tariffa.raggruppamento)
        .all()
    )
    return [r[0] for r in results]


@router.get("/tariffe-disponibili", response_model=list[TariffaDisponibile])
def tariffe_disponibili(
    comune_istat: str = Query(..., description="Codice ISTAT comune"),
    coltura_codice: str = Query("", description="Codice coltura"),
    compagnia: str = Query("", description="Filtro compagnia"),
    db: Session = Depends(get_db),
):
    """Restituisce le tariffe disponibili per un comune e coltura."""
    query = db.query(Tariffa).filter(
        (Tariffa.comune_istat == comune_istat)
        | (Tariffa.comune_ciag == comune_istat)
    )

    if coltura_codice:
        query = query.filter(
            (Tariffa.specie_codice == coltura_codice)
            | (Tariffa.specie_descrizione.ilike(f"%{coltura_codice}%"))
        )

    if compagnia:
        query = query.filter(Tariffa.compagnia == compagnia)

    results = query.all()

    return [
        TariffaDisponibile(
            compagnia=r.compagnia,
            garanzia=r.garanzia,
            tipo_garanzia=r.tipo_garanzia,
            franchigia_min=r.franchigia_min,
            tasso_agevolato=r.tasso_agevolato or 0.0,
            tasso_non_agevolato=r.tasso_non_agevolato or 0.0,
        )
        for r in results
    ]
