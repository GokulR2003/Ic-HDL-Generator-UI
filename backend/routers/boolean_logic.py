from fastapi import APIRouter, HTTPException, Request
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from services.boolean_logic import BooleanExpressionParser
from typing import List, Dict, Any, Union

router = APIRouter(
    prefix="/boolean",
    tags=["Boolean"],
)

templates = Jinja2Templates(directory="templates")

class BooleanRequest(BaseModel):
    expression: str

class BooleanResponse(BaseModel):
    original: str
    normalized: str
    variables: List[str]
    num_inputs: int
    simplified: str
    truth_table: Union[List[Dict[str, int]], str]
    verilog_expr: str
    vhdl_expr: str
    error: Union[str, None] = None

@router.get("/tool")
async def boolean_tool(request: Request):
    return templates.TemplateResponse("boolean_tool.html", {"request": request})

@router.post("/analyze", response_model=BooleanResponse)
def analyze_expression(request: BooleanRequest):
    parser = BooleanExpressionParser()
    result = parser.parse(request.expression)
    
    if "error" in result:
         # Check if it returns a dict with error or raises
         # Our parser returns a dict with error key
         return BooleanResponse(
            original=request.expression,
            normalized="",
            variables=[],
            num_inputs=0,
            simplified="",
            truth_table=[],
            verilog_expr="",
            vhdl_expr="",
            error=result["error"]
         )

    return BooleanResponse(**result)
