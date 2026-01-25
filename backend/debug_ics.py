import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal
from crud import get_ics
from fastapi.templating import Jinja2Templates

# Test DB
def test_db():
    print("Testing Database...")
    db = SessionLocal()
    try:
        ics = get_ics(db)
        print(f"Found {len(ics)} ICs")
        if ics:
            print(f"First IC: {ics[0].part_number} - {ics[0].name}")
    except Exception as e:
        print(f"Database Error: {e}")
    finally:
        db.close()

# Test Template
def test_template():
    print("\nTesting Template...")
    try:
        templates = Jinja2Templates(directory="templates")
        t = templates.get_template("ic_list.html")
        print("Template found!")
    except Exception as e:
        print(f"Template Error: {e}")

if __name__ == "__main__":
    # Ensure backend directory is in path if running from there
    sys.path.append(os.getcwd())
    test_db()
    test_template()
