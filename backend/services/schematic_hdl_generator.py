"""
Schematic to HDL Generator
Converts visual circuit designs from the designer into structural Verilog/VHDL
"""

from typing import Dict, List, Any, Tuple
from datetime import datetime


class SchematicHDLGenerator:
    """Generates HDL from schematic circuit data"""
    
    def __init__(self, circuit_data: Dict[str, Any]):
        self.circuit_data = circuit_data
        self.components = []
        self.wires = []
        self.inputs = []
        self.outputs = []
        self.parse_circuit()
    
    def parse_circuit(self):
        """Parse the circuit JSON data"""
        objects = self.circuit_data.get('objects', {}).get('objects', [])
        
        for obj in objects:
            # Check if it's an I/O component
            if obj.get('isIO'):
                io_type = obj.get('ioType')
                io_name = f"{io_type}_{obj.get('left', 0)}_{obj.get('top', 0)}"
                if io_type == 'input':
                    self.inputs.append(io_name)
                elif io_type == 'output':
                    self.outputs.append(io_name)
            
            # Check if it's an IC group
            elif obj.get('type') == 'group':
                # Extract IC name from the group (assuming text object contains it)
                ic_objects = obj.get('objects', [])
                ic_name = None
                for sub_obj in ic_objects:
                    if sub_obj.get('type') == 'text':
                        ic_name = sub_obj.get('text', '')
                        break
                
                if ic_name:
                    self.components.append({
                        'type': ic_name,
                        'instance_name': f"U{len(self.components)}_{ic_name}",
                        'position': (obj.get('left', 0), obj.get('top', 0))
                    })
        
        # Parse wires if available
        self.wires = self.circuit_data.get('wires', [])
    
    def generate_verilog(self, module_name: str = "circuit_design") -> str:
        """Generate Verilog code from the circuit"""
        
        # Start with module declaration
        verilog = f"// Generated from Circuit Designer\n"
        verilog += f"// Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        verilog += f"module {module_name}(\n"
        
        # Add input/output declarations
        io_ports = []
        for inp in self.inputs:
            io_ports.append(f"    input {inp}")
        for out in self.outputs:
            io_ports.append(f"    output {out}")
        
        if not io_ports:
            io_ports = ["    // No I/O defined"]
        
        verilog += ",\n".join(io_ports) + "\n);\n\n"
        
        # Internal wire declarations
        if self.wires:
            verilog += "    // Internal wires\n"
            for i, wire in enumerate(self.wires):
                verilog += f"    wire net_{i};\n"
            verilog += "\n"
        
        # Component instantiations
        if self.components:
            verilog += "    // Component instantiations\n"
            for comp in self.components:
                ic_type = comp['type']
                instance = comp['instance_name']
                
                # Basic instantiation (simplified - real version needs pin mapping)
                verilog += f"    {ic_type} {instance}(\n"
                verilog += f"        // TODO: Add pin connections based on wiring\n"
                verilog += f"    );\n\n"
        
        verilog += "endmodule\n"
        return verilog
    
    def generate_vhdl(self, entity_name: str = "circuit_design") -> str:
        """Generate VHDL code from the circuit"""
        
        vhdl = f"-- Generated from Circuit Designer\n"
        vhdl += f"-- Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        vhdl += f"library IEEE;\n"
        vhdl += f"use IEEE.std_logic_1164.all;\n\n"
        
        # Entity declaration
        vhdl += f"entity {entity_name} is\n"
        vhdl += f"    port(\n"
        
        io_ports = []
        for inp in self.inputs:
            io_ports.append(f"        {inp} : in std_logic")
        for out in self.outputs:
            io_ports.append(f"        {out} : out std_logic")
        
        if not io_ports:
            io_ports = ["        -- No I/O defined"]
        
        vhdl += ";\n".join(io_ports) + "\n"
        vhdl += f"    );\n"
        vhdl += f"end {entity_name};\n\n"
        
        # Architecture
        vhdl += f"architecture structural of {entity_name} is\n"
        
        # Component declarations
        if self.components:
            for comp in self.components:
                ic_type = comp['type']
                vhdl += f"    component {ic_type}\n"
                vhdl += f"        -- TODO: Add port declarations\n"
                vhdl += f"    end component;\n"
        
        # Signal declarations
        if self.wires:
            vhdl += "\n    -- Internal signals\n"
            for i, wire in enumerate(self.wires):
                vhdl += f"    signal net_{i} : std_logic;\n"
        
        vhdl += "\nbegin\n"
        
        # Component instantiations
        if self.components:
            vhdl += "    -- Component instantiations\n"
            for comp in self.components:
                instance = comp['instance_name']
                ic_type = comp['type']
                vhdl += f"    {instance}: {ic_type}\n"
                vhdl += f"        port map(\n"
                vhdl += f"            -- TODO: Add port mappings\n"
                vhdl += f"        );\n\n"
        
        vhdl += f"end structural;\n"
        return vhdl


def generate_hdl_from_circuit(circuit_data: Dict[str, Any], 
                               language: str = "verilog",
                               module_name: str = "circuit_design") -> str:
    """
    Main entry point for generating HDL from circuit data
    
    Args:
        circuit_data: The circuit design data from the canvas
        language: 'verilog' or 'vhdl'
        module_name: Name for the generated module/entity
    
    Returns:
        Generated HDL code as string
    """
    generator = SchematicHDLGenerator(circuit_data)
    
    if language.lower() == 'vhdl':
        return generator.generate_vhdl(module_name)
    else:
        return generator.generate_verilog(module_name)
