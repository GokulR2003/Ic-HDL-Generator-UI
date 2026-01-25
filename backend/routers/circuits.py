from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import crud
import schemas
from database import get_db

router = APIRouter(
    prefix="/circuits",
    tags=["Circuits"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=schemas.Circuit)
def create_circuit(circuit: schemas.CircuitCreate, db: Session = Depends(get_db)):
    """Save a new circuit design"""
    return crud.create_circuit(db=db, circuit=circuit)

@router.get("/", response_model=List[schemas.Circuit])
def list_circuits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all saved circuits"""
    circuits = crud.get_circuits(db, skip=skip, limit=limit)
    return circuits

@router.get("/{circuit_id}", response_model=schemas.Circuit)
def get_circuit(circuit_id: int, db: Session = Depends(get_db)):
    """Get a specific circuit by ID"""
    db_circuit = crud.get_circuit(db, circuit_id=circuit_id)
    if db_circuit is None:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return db_circuit

@router.put("/{circuit_id}", response_model=schemas.Circuit)
def update_circuit(circuit_id: int, circuit: schemas.CircuitUpdate, db: Session = Depends(get_db)):
    """Update an existing circuit"""
    db_circuit = crud.update_circuit(db, circuit_id=circuit_id, circuit_update=circuit)
    if db_circuit is None:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return db_circuit

@router.delete("/{circuit_id}")
def delete_circuit(circuit_id: int, db: Session = Depends(get_db)):
    """Delete a circuit"""
    success = crud.delete_circuit(db, circuit_id=circuit_id)
    if not success:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return {"message": "Circuit deleted successfully"}
