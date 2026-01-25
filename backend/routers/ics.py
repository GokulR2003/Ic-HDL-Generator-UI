from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import crud
import schemas
from database import get_db

router = APIRouter(
    prefix="/ics",
    tags=["ICs"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.IC])
def read_ics(skip: int = 0, limit: int = 100, search: str = None, db: Session = Depends(get_db)):
    if search:
        return crud.search_ics(db, search)
    return crud.get_ics(db, skip=skip, limit=limit)

@router.get("/{part_number}", response_model=schemas.IC)
def read_ic(part_number: str, db: Session = Depends(get_db)):
    db_ic = crud.get_ic_by_part_number(db, part_number=part_number)
    if db_ic is None:
        raise HTTPException(status_code=404, detail="IC not found")
    return db_ic
