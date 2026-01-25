import json
import os
import sys
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import ICDefinition

# Ensure tables exist
Base.metadata.create_all(bind=engine)

def seed_ics():
    db = SessionLocal()
    try:
        # Load JSON file
        # Assuming the script is run from backend/ directory and json is in root
        json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Ic_Metadata_Master.json')
        
        if not os.path.exists(json_path):
            print(f"Error: {json_path} not found")
            return

        with open(json_path, 'r') as f:
            data = json.load(f)
        
        print(f"Found {len(data)} ICs in metadata file")
        
        for item in data:
            part_number = item.get('part_number')
            
            # Check if exists
            existing = db.query(ICDefinition).filter(ICDefinition.part_number == part_number).first()
            if existing:
                print(f"Skipping {part_number} (already exists)")
                continue
            
            # Map JSON fields to DB columns
            # We split the big JSON into logical chunks for the DB columns
            
            pins_config = {
                "ports": item.get('ports', {}),
                "pin_map": item.get('pin_map', {})
            }
            
            logic_behavior = {
                "behavior": item.get('behavior', {}),
                "truth_table": item.get('behavior', {}).get('truth_table', {}),
                "parameters": item.get('parameters', {})
            }
            
            physical_props = {
                "package_types": item.get('package_types', []),
                "complexity_score": item.get('complexity_score', 1),
                "ocr_patterns": item.get('ocr_patterns', {}),
                "symbol_recognition": item.get('symbol_recognition', {})
            }
            
            template_data = {
                "template": item.get('template'),
                "template_requirements": item.get('template_requirements', {}),
                "test_coverage": item.get('test_coverage', {})
            }
            
            new_ic = ICDefinition(
                part_number=part_number,
                name=item.get('ic_name', f"IC {part_number}"),
                category=item.get('category', 'unknown'),
                family=item.get('logic_family', 'TTL'),
                description=item.get('notes', 'No description available'),
                pins_configuration=pins_config,
                logic_behavior=logic_behavior,
                physical_properties=physical_props,
                template_data=template_data
            )
            
            db.add(new_ic)
            print(f"Added {part_number}")
        
        db.commit()
        print("Seeding complete!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_ics()
