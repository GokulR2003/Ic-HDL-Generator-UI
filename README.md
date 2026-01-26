# IC HDL Generator - Setup & Running Guide

A comprehensive web application for designing digital circuits and generating HDL (Verilog/VHDL) code.

---

## 📁 Project Structure

```
ic_hdl_generator-main/
├── backend/                 # FastAPI Backend Server
│   ├── main.py             # Main application entry point
│   ├── database.py         # Database configuration
│   ├── models.py           # SQLAlchemy models
│   ├── schemas.py          # Pydantic schemas
│   ├── crud.py             # Database operations
│   ├── routers/            # API route handlers
│   ├── services/           # Business logic (HDL generation)
│   ├── templates/          # Jinja2 HTML templates
│   ├── static/             # Static files (CSS, JS)
│   └── requirements.txt    # Python dependencies
│
└── frontend/               # Next.js Frontend (optional)
    ├── app/                # Next.js app directory
    ├── components/         # React components
    └── package.json        # Node.js dependencies
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** (for frontend) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

---

## 📦 Backend Setup & Running

### Step 1: Navigate to Backend Directory

```powershell
cd d:\ic_hdl_generator-main\backend
```

### Step 2: Create Virtual Environment (First Time Only)

```powershell
python -m venv venv
```

### Step 3: Activate Virtual Environment

```powershell
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows Command Prompt
.\venv\Scripts\activate.bat

# Linux/macOS
source venv/bin/activate
```

> ✅ You should see `(venv)` at the beginning of your terminal prompt.

### Step 4: Install Dependencies (First Time or After Updates)

```powershell
pip install -r requirements.txt
```

### Step 5: Run the Backend Server

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Server Options:**
| Flag | Description |
|------|-------------|
| `--reload` | Auto-restart on code changes (development) |
| `--host 0.0.0.0` | Allow external connections |
| `--port 8000` | Port number (default: 8000) |

### Step 6: Verify Backend is Running

Open your browser and go to:
- **Main App:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Circuit Designer:** http://localhost:8000/designer

---

## 🎨 Frontend Setup & Running (Optional)

The backend serves a complete web interface via templates, but if you want to run the Next.js frontend separately:

### Step 1: Navigate to Frontend Directory

```powershell
cd d:\ic_hdl_generator-main\frontend
```

### Step 2: Install Dependencies (First Time Only)

```powershell
npm install
```

### Step 3: Run the Development Server

```powershell
npm run dev
```

### Step 4: Access the Frontend

Open your browser: http://localhost:3000

---

## 🔄 Running Both Together

### Option 1: Two Terminals (Recommended for Development)

**Terminal 1 - Backend:**
```powershell
cd d:\ic_hdl_generator-main\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

**Terminal 2 - Frontend (if using Next.js):**
```powershell
cd d:\ic_hdl_generator-main\frontend
npm run dev
```

### Option 2: Backend Only (Quickest)

If you just need the circuit designer and HDL generator, the backend alone is sufficient:

```powershell
cd d:\ic_hdl_generator-main\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Then visit: http://localhost:8000

---

## 🛑 Stopping the Servers

### Stop a Running Server

Press `Ctrl + C` in the terminal where the server is running.

### Deactivate Virtual Environment

```powershell
deactivate
```

---

## 📋 Complete Restart Procedure

When starting fresh after everything is closed:

### 1. Start Backend

```powershell
# Open PowerShell/Terminal
cd d:\ic_hdl_generator-main\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start server
uvicorn main:app --reload
```

### 2. Start Frontend (Optional)

```powershell
# Open another PowerShell/Terminal
cd d:\ic_hdl_generator-main\frontend

# Start development server
npm run dev
```

### 3. Access the Application

| Service | URL |
|---------|-----|
| Home Page | http://localhost:8000 |
| Circuit Designer | http://localhost:8000/designer |
| Boolean Tool | http://localhost:8000/boolean/tool |
| IC Database | http://localhost:8000/ics-view |
| API Documentation | http://localhost:8000/docs |
| Frontend (Next.js) | http://localhost:3000 |

---

## 🔧 Troubleshooting

### "uvicorn is not recognized"

Make sure the virtual environment is activated:
```powershell
.\venv\Scripts\Activate.ps1
```

### "Module not found" errors

Reinstall dependencies:
```powershell
pip install -r requirements.txt
```

### Port already in use

Use a different port:
```powershell
uvicorn main:app --reload --port 8001
```

Or kill the process using the port:
```powershell
# Find the process
netstat -ano | findstr :8000

# Kill it (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

### Database issues

The SQLite database is at `backend/ic_hdl.db`. To reset:
```powershell
# Delete the database (will lose all data!)
del backend\ic_hdl.db

# Restart the server - it will recreate the database
uvicorn main:app --reload
```

---

## 📝 Development Commands Cheat Sheet

```powershell
# === BACKEND ===
cd d:\ic_hdl_generator-main\backend
.\venv\Scripts\Activate.ps1          # Activate venv
pip install -r requirements.txt       # Install deps
uvicorn main:app --reload             # Run server
deactivate                            # Exit venv

# === FRONTEND ===
cd d:\ic_hdl_generator-main\frontend
npm install                           # Install deps
npm run dev                           # Run dev server
npm run build                         # Build for production

# === GIT ===
git status                            # Check changes
git add -A                            # Stage all changes
git commit -m "message"               # Commit
git push origin master                # Push to Ic-HDL-Generator-UI
git push icdb master:main             # Push to IcDatabase
```

---

## 🌐 Repository Links

- **Ic-HDL-Generator-UI:** https://github.com/GokulR2003/Ic-HDL-Generator-UI
- **IcDatabase:** https://github.com/GokulR2003/IcDatabase

---

## ✅ Quick Verification Checklist

After starting the servers, verify everything works:

- [ ] Backend running at http://localhost:8000
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Circuit Designer loads at http://localhost:8000/designer
- [ ] Can drag & drop components onto canvas
- [ ] Can draw wires between components
- [ ] Export HDL generates valid code
- [ ] Boolean tool works at http://localhost:8000/boolean/tool

---

**Last Updated:** January 26, 2026
