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


class ValidateRequest(BaseModel):
    circuit_data: dict
    module_name: str = "circuit_design"


@router.post("/validate")
def validate_schematic(request: ValidateRequest):
    """Check a schematic for errors/warnings without generating HDL."""
    from services.schematic_hdl_generator import SchematicHDLGenerator, ICPinDatabase

    errors: list = []
    warnings: list = []

    try:
        gen = SchematicHDLGenerator(request.circuit_data)
    except Exception as e:
        return {
            "valid": False,
            "errors": [{"code": "PARSE_ERROR", "message": str(e)}],
            "warnings": [],
        }

    if not gen.components:
        warnings.append({"code": "NO_ICS", "message": "No IC components found. Drag ICs from the palette."})

    if not gen.inputs:
        warnings.append({"code": "NO_INPUTS", "message": "No input ports. Add Switch components."})

    if not gen.outputs:
        warnings.append({"code": "NO_OUTPUTS", "message": "No output ports. Add LED components."})

    for comp in gen.components:
        if comp["type"] not in ICPinDatabase.IC_PIN_DEFINITIONS:
            errors.append({
                "code": "UNKNOWN_IC",
                "message": f"Unknown IC: {comp['type']}. Supported: {', '.join(ICPinDatabase.IC_PIN_DEFINITIONS.keys())}",
            })

    unconnected = [
        c["instance_name"] for c in gen.components
        if not any(
            (ep.get("icType") == c["type"] or ep.get("pinName"))
            for w in gen.wires
            for ep in (w["start"], w["end"])
        )
    ]
    if unconnected:
        warnings.append({
            "code": "UNCONNECTED_ICS",
            "message": f"ICs with no wires: {', '.join(unconnected)}",
        })

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "stats": {
            "components": len(gen.components),
            "wires": len(gen.wires),
            "inputs": len(gen.inputs),
            "outputs": len(gen.outputs),
        },
    }


class TruthTableRequest(BaseModel):
    circuit_data: dict
    max_rows: int = 256


@router.post("/truth-table")
def truth_table(request: TruthTableRequest):
    """Evaluate all 2^N input combinations and return the truth table."""
    try:
        from services.circuit_evaluator import generate_truth_table
        return generate_truth_table(request.circuit_data, request.max_rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


class TestbenchRequest(BaseModel):
    circuit_data: dict
    module_name: str = "circuit_design"


@router.post("/testbench")
def generate_schematic_testbench(request: TestbenchRequest):
    """Generate a Verilog testbench template from a visual schematic."""
    try:
        from services.schematic_hdl_generator import generate_testbench_from_circuit
        tb = generate_testbench_from_circuit(request.circuit_data, request.module_name)
        return {
            "testbench_code": tb,
            "filename": f"tb_{request.module_name}.v",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Testbench error: {str(e)}")
