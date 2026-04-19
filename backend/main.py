import os
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
import crud

app = FastAPI(
    title="IC HDL Generator API",
    description="API for generating HDL code and simulating digital circuits",
    version="1.0.0",
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Structured error responses (P5.5) ─────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "message": "Request validation failed", "details": exc.errors()},
    )

# ── Routers: versioned (/api/v1) + legacy (backward compat) ──
from routers import ics, generator, boolean_logic, circuits

API_V1 = "/api/v1"
app.include_router(ics.router,           prefix=API_V1)
app.include_router(generator.router,     prefix=API_V1)
app.include_router(boolean_logic.router, prefix=API_V1)
app.include_router(circuits.router,      prefix=API_V1)

# Legacy unversioned (to be removed in v2)
app.include_router(ics.router)
app.include_router(generator.router)
app.include_router(boolean_logic.router)
app.include_router(circuits.router)

# ── HTML / template routes ─────────────────────────────────────
@app.get("/ics-view")
async def view_ics(request: Request, search: str = "", db: Session = Depends(get_db)):
    ics_data = crud.search_ics(db, search) if search else crud.get_ics(db, limit=100)
    return templates.TemplateResponse("ic_list.html", {
        "request": request,
        "ics": ics_data,
        "search_query": search,
    })

@app.get("/ics-view/{part_number}")
async def view_ic_detail(request: Request, part_number: str, db: Session = Depends(get_db)):
    db_ic = crud.get_ic_by_part_number(db, part_number=part_number)
    if db_ic is None:
        raise HTTPException(status_code=404, detail="IC not found")
    return templates.TemplateResponse("ic_detail.html", {"request": request, "ic": db_ic})

@app.get("/designer-legacy")
async def circuit_designer_legacy(request: Request):
    """Original Jinja-based designer — kept during Next.js migration."""
    return templates.TemplateResponse("designer.html", {"request": request})

# ── Health (P5.7) ──────────────────────────────────────────────
# Declared BEFORE the frontend mount so it is not intercepted.
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "ok" if db_ok else "error",
        "version": app.version,
    }

# ── Root: Next.js in prod, Jinja fallback in dev ──────────────
# In production (Render): frontend/out/ exists → StaticFiles serves everything.
# In local dev: Next.js runs on :3000; backend serves the old Jinja index at /.
_FRONTEND_OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "out")
if os.path.isdir(_FRONTEND_OUT):
    # MUST be last — Mount("/") captures all remaining requests.
    app.mount("/", StaticFiles(directory=_FRONTEND_OUT, html=True), name="frontend")
else:
    @app.get("/")
    async def root(request: Request):
        return templates.TemplateResponse("index.html", {"request": request})
