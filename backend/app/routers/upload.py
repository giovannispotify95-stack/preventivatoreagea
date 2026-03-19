"""
API per upload e gestione file Excel delle compagnie.
"""
from __future__ import annotations

import io
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Tariffa, PrezzoColtura, VersioneListino
from app.schemas import UploadResponse, VersioneListinoResponse
from app.parsers.generali import parse_generali
from app.parsers.revo import parse_revo
from app.parsers.reale_mutua import parse_reale_mutua
from app.parsers.prezzi_colture import parse_prezzi_colture

router = APIRouter(prefix="/api/admin", tags=["Backoffice"])

PARSER_MAP = {
    "generali": parse_generali,
    "revo": parse_revo,
    "realemutua": parse_reale_mutua,
    "reale_mutua": parse_reale_mutua,
}


@router.post("/upload-listino", response_model=UploadResponse)
async def upload_listino(
    compagnia: str = Query(
        ...,
        description="Nome compagnia: generali, revo, realemutua",
    ),
    anno: int = Query(2026, description="Anno di validità"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Carica un nuovo file Excel listino per una compagnia.
    Valida la struttura e inserisce i dati nel database.
    """
    compagnia_key = compagnia.lower().replace(" ", "").replace("_", "")

    if compagnia_key not in PARSER_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Compagnia '{compagnia}' non supportata. "
                   f"Usa: generali, revo, realemutua",
        )

    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Il file deve essere in formato Excel (.xlsx o .xls).",
        )

    # Determina nuova versione
    ultima_versione = (
        db.query(VersioneListino)
        .filter(VersioneListino.compagnia == compagnia)
        .order_by(VersioneListino.versione.desc())
        .first()
    )
    nuova_versione = (ultima_versione.versione + 1) if ultima_versione else 1

    # Leggi file in memoria
    contents = await file.read()
    file_buffer = io.BytesIO(contents)

    try:
        parser = PARSER_MAP[compagnia_key]
        num_records = parser(file_buffer, db, anno=anno, versione=nuova_versione)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Errore nel parsing del file: {str(e)}",
        )

    # Registra versione listino
    versione_record = VersioneListino(
        compagnia=compagnia,
        nome_file=file.filename,
        anno_validita=anno,
        data_caricamento=datetime.utcnow(),
        num_record=num_records,
        attivo=True,
        versione=nuova_versione,
    )
    db.add(versione_record)
    db.commit()

    return UploadResponse(
        success=True,
        compagnia=compagnia,
        records_importati=num_records,
        messaggio=f"File caricato con successo. {num_records} record importati.",
        versione=nuova_versione,
    )


@router.post("/upload-prezzi")
async def upload_prezzi(
    anno: int = Query(2026, description="Anno di validità"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Carica il file PrezziColture.xlsx."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Il file deve essere in formato Excel (.xlsx o .xls).",
        )

    contents = await file.read()
    file_buffer = io.BytesIO(contents)

    try:
        num_records = parse_prezzi_colture(file_buffer, db, anno=anno)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Errore nel parsing del file prezzi: {str(e)}",
        )

    return {
        "success": True,
        "records_importati": num_records,
        "messaggio": f"Prezzi colture caricati: {num_records} record.",
    }


@router.get("/versioni-listino", response_model=list[VersioneListinoResponse])
def lista_versioni(
    compagnia: str = Query("", description="Filtro compagnia"),
    db: Session = Depends(get_db),
):
    """Restituisce lo storico delle versioni listino caricate."""
    query = db.query(VersioneListino).order_by(
        VersioneListino.data_caricamento.desc()
    )
    if compagnia:
        query = query.filter(VersioneListino.compagnia.ilike(f"%{compagnia}%"))

    return query.all()
