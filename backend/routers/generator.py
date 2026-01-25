from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database import get_db
from services import HDLGeneratorService
from pydantic import BaseModel

router = APIRouter(
    prefix="/generator",
    tags=["Generator"],
)

class GenerationRequest(BaseModel):
    ic_id: int
    language: str = "verilog" # verilog, vhdl
    generate_testbench: bool = False

class GenerationResponse(BaseModel):
    hdl_code: str
    testbench_code: str | None = None
    filename: str

@router.post("/generate", response_model=GenerationResponse)
def generate_code(request: GenerationRequest, db: Session = Depends(get_db)):
    service = HDLGeneratorService(db)
    
    try:
        hdl_code = service.generate_hdl(request.ic_id, request.language)
        
        tb_code = None
        if request.generate_testbench:
            tb_code = service.generate_testbench(request.ic_id)
            
        # Determine filename
        from crud import get_ic
        ic_obj = get_ic(db, request.ic_id)
        if not ic_obj:
             raise HTTPException(status_code=404, detail="IC not found")
             
        ext = ".v" if request.language == "verilog" else ".vhd"
        filename = f"IC_{ic_obj.part_number}{ext}"

        return GenerationResponse(
            hdl_code=hdl_code,
            testbench_code=tb_code,
            filename=filename
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SchematicGenerationRequest(BaseModel):
    circuit_data: dict  # The design_data from the circuit
    language: str = "verilog"
    module_name: str = "circuit_design"


@router.post("/generate-from-schematic")
def generate_from_schematic(request: SchematicGenerationRequest):
    """Generate HDL code from a visual circuit schematic"""
    try:
        from services.schematic_hdl_generator import generate_hdl_from_circuit
        
        hdl_code = generate_hdl_from_circuit(
            circuit_data=request.circuit_data,
            language=request.language,
            module_name=request.module_name
        )
        
        ext = ".v" if request.language == "verilog" else ".vhd"
        filename = f"{request.module_name}{ext}"
        
        return {
            "hdl_code": hdl_code,
            "filename": filename,
            "language": request.language
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")
