from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from database import get_db
import crud

app = FastAPI(
    title="IC HDL Generator API",
    description="API for generating HDL code and simulating digital circuits",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for now since we are serving locally
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/ics-view")
async def view_ics(request: Request, search: str = "", db: Session = Depends(get_db)):
    if search:
        ics = crud.search_ics(db, search)
    else:
        ics = crud.get_ics(db, limit=100)
    
    return templates.TemplateResponse("ic_list.html", {
        "request": request, 
        "ics": ics,
        "search_query": search
    })

@app.get("/ics-view/{part_number}")
async def view_ic_detail(request: Request, part_number: str, db: Session = Depends(get_db)):
    db_ic = crud.get_ic_by_part_number(db, part_number=part_number)
    if db_ic is None:
        raise HTTPException(status_code=404, detail="IC not found")
        
    return templates.TemplateResponse("ic_detail.html", {
        "request": request,
        "ic": db_ic
    })

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/designer")
async def circuit_designer(request: Request):
    return templates.TemplateResponse("designer.html", {"request": request})

# Include Routers
from routers import ics, generator, boolean_logic, circuits
app.include_router(ics.router)
app.include_router(generator.router)
app.include_router(boolean_logic.router)
app.include_router(circuits.router)
