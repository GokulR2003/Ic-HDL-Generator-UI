from sqlalchemy.orm import Session
from models import ICDefinition, User, Project, Circuit
from schemas import ICCreate, UserCreate, CircuitCreate, CircuitUpdate
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_ic(db: Session, ic_id: int):
    return db.query(ICDefinition).filter(ICDefinition.id == ic_id).first()

def get_ic_by_part_number(db: Session, part_number: str):
    return db.query(ICDefinition).filter(ICDefinition.part_number == part_number).first()

def get_ics(db: Session, skip: int = 0, limit: int = 100):
    return db.query(ICDefinition).offset(skip).limit(limit).all()

def search_ics(db: Session, query: str):
    return db.query(ICDefinition).filter(
        (ICDefinition.part_number.contains(query)) | 
        (ICDefinition.name.contains(query)) |
        (ICDefinition.description.contains(query))
    ).all()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = User(email=user.email, username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Circuit CRUD ---
def create_circuit(db: Session, circuit: CircuitCreate):
    db_circuit = Circuit(**circuit.dict())
    db.add(db_circuit)
    db.commit()
    db.refresh(db_circuit)
    return db_circuit

def get_circuit(db: Session, circuit_id: int):
    return db.query(Circuit).filter(Circuit.id == circuit_id).first()

def get_circuits(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Circuit).offset(skip).limit(limit).all()

def update_circuit(db: Session, circuit_id: int, circuit_update: CircuitUpdate):
    db_circuit = db.query(Circuit).filter(Circuit.id == circuit_id).first()
    if db_circuit:
        for key, value in circuit_update.dict(exclude_unset=True).items():
            setattr(db_circuit, key, value)
        db.commit()
        db.refresh(db_circuit)
    return db_circuit

def delete_circuit(db: Session, circuit_id: int):
    db_circuit = db.query(Circuit).filter(Circuit.id == circuit_id).first()
    if db_circuit:
        db.delete(db_circuit)
        db.commit()
        return True
    return False
