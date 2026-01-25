#!/bin/bash

echo "🚀 Starting IC HDL Generator..."
echo "================================"

# Navigate to backend directory
cd backend

# Check if database exists
if [ ! -f "ic_hdl.db" ]; then
    echo "📦 Initializing database..."
    python seed_db.py
else
    echo "✅ Database already exists"
fi

# Start the server
echo "🌐 Starting server..."
gunicorn main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --access-logfile - \
    --error-logfile - \
    --log-level info
