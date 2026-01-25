from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    projects = relationship("Project", back_populates="owner")

class ICDefinition(Base):
    __tablename__ = "ic_definitions"

    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, index=True)
    family = Column(String)  # TTL, CMOS
    description = Column(Text)
    
    # Store complex nested data as JSON
    pins_configuration = Column(JSON)  # Pin mapping
    logic_behavior = Column(JSON)      # Truth tables, boolean functions
    physical_properties = Column(JSON) # Package types, etc.
    template_data = Column(JSON)       # Template requirements
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="projects")
    circuits = relationship("Circuit", back_populates="project")

class Circuit(Base):
    __tablename__ = "circuits"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"))
    
    # Circuit type: 'gate_level', 'verilog_import', 'composition'
    circuit_type = Column(String, default='composition')
    
    # The actual design data (React Flow JSON or raw HDL)
    design_data = Column(JSON) 
    generated_hdl = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="circuits")
