import os
import json
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from models import ICDefinition

class HDLGeneratorService:
    def __init__(self, db: Session):
        self.db = db
        # Set template directories relative to backend root
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.template_dir = os.path.join(self.base_dir, 'hdl_templates')
        self.testbench_dir = os.path.join(self.base_dir, 'testbench_templates')
        
        # Initialize Jinja environment
        self.env = Environment(
            loader=FileSystemLoader([self.template_dir, self.testbench_dir]),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Build template maps
        self.verilog_templates = self.build_template_map('verilog')
        self.vhdl_templates = self.build_template_map('vhdl')
        self.testbench_templates = self.build_testbench_map()

    def build_template_map(self, language='verilog'):
        """Map IC part numbers to their template paths - optimized for DB usage"""
        # Note: In the original script, this scanned files and matched with JSON metadata.
        # Here we scan files to know what exists, but mapping will primarily come from DB logic.
        template_map = {}
        ext = '.vtpl' if language == 'verilog' else '.vhdltpl'
        
        for root, dirs, files in os.walk(self.template_dir):
            for file in files:
                if file.endswith(ext):
                    # Store relative path
                    rel_path = os.path.relpath(os.path.join(root, file), self.template_dir)
                    # Normalize to forward slashes for Jinja2
                    rel_path = rel_path.replace('\\', '/')
                    # Use filename without extension as key for generic lookup
                    template_name = file.replace(ext, '')
                    template_map[template_name] = rel_path
        
        return template_map

    def build_testbench_map(self):
        """Map generic testbenches"""
        testbench_map = {}
        for root, dirs, files in os.walk(self.testbench_dir):
            for file in files:
                if file.endswith('_tb.vtpl'):
                    rel_path = os.path.relpath(os.path.join(root, file), self.testbench_dir)
                    # Normalize to forward slashes for Jinja2
                    rel_path = rel_path.replace('\\', '/')
                    template_name = file.replace('_tb.vtpl', '')
                    testbench_map[template_name] = rel_path
        return testbench_map

    def find_template(self, ic_data: ICDefinition, language='verilog'):
        """Find appropriate template for IC"""
        template_data = ic_data.template_data or {}
        template_name = template_data.get('template', ic_data.category)
        
        if language == 'verilog':
            template_map = self.verilog_templates
            ext = '.vtpl'
        else:
            template_map = self.vhdl_templates
            ext = '.vhdltpl'
        
        # 1. Direct match in map (e.g., 'nand_quad')
        if template_name in template_map:
            return template_map[template_name]
        
        # 2. Try category-based lookup if specific template not found
        # (This logic mimics the filesystem search from original script)
        # For simplicity, we search our pre-built map for keys like 'nand_quad'
        
        # 3. Fallback to generic
        if 'generic' in template_map:
             return template_map['generic']
             
        return None

    def find_testbench_template(self, ic_data: ICDefinition):
        """Find testbench template"""
        template_data = ic_data.template_data or {}
        template_name = template_data.get('template')
        category = ic_data.category
        
        # Try specific template
        if template_name and template_name in self.testbench_templates:
            return self.testbench_templates[template_name]
            
        # Try category
        if category and category in self.testbench_templates:
            return self.testbench_templates[category]
            
        # Fallback
        return self.testbench_templates.get('generic', None)

    def prepare_context(self, ic: ICDefinition):
        """Prepare context dictionary for Jinja2"""
        context = {
            "part_number": ic.part_number,
            "ic_name": ic.name,
            "category": ic.category,
            "family": ic.family,
            "description": ic.description,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            
            # Flatten JSON fields into context root as expected by templates
            **ic.pins_configuration,     # ports, pin_map
            **ic.logic_behavior,         # behavior, truth_table, parameters
            **ic.physical_properties,    # package_types
            **(ic.template_data or {}),  # template, test_coverage
        }
        
        # Ensure critical keys exist
        context.setdefault('ports', {})
        context['ports'].setdefault('inputs', [])
        context['ports'].setdefault('outputs', [])
        context['ports'].setdefault('power', ['VCC', 'GND'])
        
        return context

    def generate_hdl(self, ic_id: int, language='verilog'):
        """Generate HDL code for an IC"""
        ic = self.db.query(ICDefinition).filter(ICDefinition.id == ic_id).first()
        if not ic:
            raise ValueError(f"IC with ID {ic_id} not found")
            
        context = self.prepare_context(ic)
        template_path = self.find_template(ic, language)
        
        if not template_path:
            raise ValueError(f"No {language} template found for {ic.part_number}")
            
        template = self.env.get_template(template_path)
        return template.render(**context)

    def generate_testbench(self, ic_id: int):
        """Generate Testbench code"""
        ic = self.db.query(ICDefinition).filter(ICDefinition.id == ic_id).first()
        if not ic:
            raise ValueError(f"IC with ID {ic_id} not found")
            
        context = self.prepare_context(ic)
        template_path = self.find_testbench_template(ic)
        
        if not template_path:
            raise ValueError(f"No testbench template found for {ic.part_number}")
            
        template = self.env.get_template(template_path)
        return template.render(**context)
