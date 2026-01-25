from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- IC Schemas ---
class ICBase(BaseModel):
    part_number: str
    name: str
    category: str
    family: str = "TTL"
    description: Optional[str] = None
    pins_configuration: Dict[str, Any] = {}
    logic_behavior: Dict[str, Any] = {}
    physical_properties: Dict[str, Any] = {}
    template_data: Dict[str, Any] = {}

class ICCreate(ICBase):
    pass

class IC(ICBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Circuit Schemas ---
class CircuitBase(BaseModel):
    name: str
    description: Optional[str] = None

class CircuitCreate(CircuitBase):
    design_data: Dict[str, Any]  # Canvas state: components, wires, positions

class CircuitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    design_data: Optional[Dict[str, Any]] = None

class Circuit(CircuitBase):
    id: int
    project_id: Optional[int] = None
    circuit_type: str = 'composition'
    design_data: Dict[str, Any]
    generated_hdl: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
