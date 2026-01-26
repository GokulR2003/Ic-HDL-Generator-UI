"""
Schematic to HDL Generator
Converts visual circuit designs from the designer into structural Verilog/VHDL
"""

from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
import re


class SchematicHDLGenerator:
    """Generates HDL from schematic circuit data"""
    
    def __init__(self, circuit_data: Dict[str, Any]):
        self.circuit_data = circuit_data
        self.components = []  # ICs
        self.io_components = []  # Switches, LEDs
        self.wires = []
        self.inputs = []
        self.outputs = []
        self.net_connections = {}  # Maps positions to net names
        self.component_positions = {}  # Maps component positions to component info
        self.parse_circuit()
    
    def _make_valid_identifier(self, name: str) -> str:
        """Convert a name to a valid Verilog/VHDL identifier"""
        # If starts with a digit, prefix with 'IC_'
        if name and name[0].isdigit():
            name = f"IC_{name}"
        # Replace any non-alphanumeric characters with underscore
        name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        return name
    
    def _pos_key(self, left: float, top: float, tolerance: float = 20) -> str:
        """Create a position key for matching ports (with tolerance)"""
        # Round to nearest grid position for matching
        return f"{round(left/tolerance)*tolerance}_{round(top/tolerance)*tolerance}"
    
    def parse_circuit(self):
        """Parse the circuit JSON data"""
        objects = self.circuit_data.get('objects', {}).get('objects', [])
        
        component_id = 0
        
        for obj in objects:
            obj_left = obj.get('left', 0)
            obj_top = obj.get('top', 0)
            
            # Check if it's an I/O component (Switch or LED)
            if obj.get('isIO'):
                io_type = obj.get('ioType')
                io_id = f"io_{component_id}"
                component_id += 1
                
                io_info = {
                    'id': io_id,
                    'type': io_type,
                    'position': (obj_left, obj_top),
                    'name': f"{'sw' if io_type == 'input' else 'led'}_{len([x for x in self.io_components if x['type'] == io_type])}"
                }
                self.io_components.append(io_info)
                
                # Register position for wire matching
                pos_key = self._pos_key(obj_left, obj_top)
                self.component_positions[pos_key] = {
                    'component': io_info,
                    'is_io': True,
                    'io_type': io_type
                }
                
                # Add to inputs/outputs
                if io_type == 'input':
                    self.inputs.append(io_info['name'])
                else:
                    self.outputs.append(io_info['name'])
            
            # Check if it's an IC group
            elif obj.get('type') == 'group':
                # Extract IC name from the group
                ic_objects = obj.get('objects', [])
                ic_name = None
                
                for sub_obj in ic_objects:
                    if sub_obj.get('type') == 'text':
                        text = sub_obj.get('text', '')
                        # Check if it looks like an IC part number
                        if text and (text[0].isdigit() or text.startswith('74') or text.startswith('IC')):
                            ic_name = text
                            break
                
                if ic_name:
                    instance_name = f"U{len(self.components)}_{self._make_valid_identifier(ic_name)}"
                    ic_info = {
                        'id': f"ic_{component_id}",
                        'type': ic_name,
                        'valid_type': self._make_valid_identifier(ic_name),
                        'instance_name': instance_name,
                        'position': (obj_left, obj_top),
                        'pins': []
                    }
                    component_id += 1
                    self.components.append(ic_info)
        
        # Parse wires
        raw_wires = self.circuit_data.get('wires', [])
        
        # Create net assignments based on wire connections
        net_counter = 0
        
        for wire in raw_wires:
            start = wire.get('start', {})
            end = wire.get('end', {})
            
            start_key = self._pos_key(start.get('left', 0), start.get('top', 0))
            end_key = self._pos_key(end.get('left', 0), end.get('top', 0))
            
            # Check if either end is already assigned a net
            start_net = self.net_connections.get(start_key)
            end_net = self.net_connections.get(end_key)
            
            if start_net and end_net:
                # Both already have nets - they should be the same or we merge
                net_name = start_net
            elif start_net:
                net_name = start_net
            elif end_net:
                net_name = end_net
            else:
                net_name = f"net_{net_counter}"
                net_counter += 1
            
            self.net_connections[start_key] = net_name
            self.net_connections[end_key] = net_name
            
            self.wires.append({
                'start': start,
                'end': end,
                'start_key': start_key,
                'end_key': end_key,
                'net': net_name
            })
    
    def _get_io_connections(self) -> Dict[str, str]:
        """Map I/O component names to their connected nets"""
        io_to_net = {}
        
        for io_comp in self.io_components:
            pos_key = self._pos_key(io_comp['position'][0], io_comp['position'][1])
            if pos_key in self.net_connections:
                io_to_net[io_comp['name']] = self.net_connections[pos_key]
        
        return io_to_net
    
    def _get_unique_nets(self) -> List[str]:
        """Get list of unique internal nets (excluding I/O)"""
        io_names = set(self.inputs + self.outputs)
        io_to_net = self._get_io_connections()
        io_nets = set(io_to_net.values())
        
        # Get all unique nets
        all_nets = set(self.net_connections.values())
        
        # Internal nets are those not directly connected to I/O
        internal_nets = all_nets - io_nets
        
        return sorted(list(internal_nets))
    
    def generate_verilog(self, module_name: str = "circuit_design") -> str:
        """Generate Verilog code from the circuit"""
        
        # Make module name valid
        module_name = self._make_valid_identifier(module_name)
        
        # Start with module declaration
        verilog = f"// Generated from Circuit Designer\n"
        verilog += f"// Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        
        # Get I/O to net mappings
        io_to_net = self._get_io_connections()
        
        # Build port list
        verilog += f"module {module_name}(\n"
        
        io_ports = []
        for inp in self.inputs:
            io_ports.append(f"    input wire {inp}")
        for out in self.outputs:
            io_ports.append(f"    output wire {out}")
        
        if io_ports:
            verilog += ",\n".join(io_ports) + "\n"
        else:
            verilog += "    // No I/O ports defined\n"
        
        verilog += ");\n\n"
        
        # Internal wire declarations
        internal_nets = self._get_unique_nets()
        if internal_nets:
            verilog += "    // Internal wires\n"
            for net in internal_nets:
                verilog += f"    wire {net};\n"
            verilog += "\n"
        
        # I/O to internal net assignments
        if io_to_net:
            verilog += "    // I/O to internal net connections\n"
            for io_name, net in io_to_net.items():
                if io_name in self.inputs:
                    verilog += f"    // Input {io_name} connects to {net}\n"
                else:
                    verilog += f"    // Output {io_name} connects to {net}\n"
            verilog += "\n"
        
        # Component instantiations
        if self.components:
            verilog += "    // Component instantiations\n"
            verilog += "    // Note: Pin connections need to be configured based on your IC definitions\n\n"
            
            for comp in self.components:
                ic_type = comp['valid_type']
                instance = comp['instance_name']
                
                verilog += f"    // {comp['type']} - {self._get_ic_description(comp['type'])}\n"
                verilog += f"    {ic_type} {instance} (\n"
                
                # Try to generate meaningful port connections based on IC type
                port_connections = self._generate_port_connections(comp, io_to_net)
                verilog += port_connections
                
                verilog += f"    );\n\n"
        
        verilog += "endmodule\n"
        
        # Add module templates for ICs used
        verilog += self._generate_ic_modules()
        
        return verilog
    
    def _get_ic_description(self, ic_type: str) -> str:
        """Get a description for common ICs"""
        descriptions = {
            '7400': 'Quad 2-input NAND gate',
            '7402': 'Quad 2-input NOR gate',
            '7404': 'Hex inverter',
            '7408': 'Quad 2-input AND gate',
            '7432': 'Quad 2-input OR gate',
            '7486': 'Quad 2-input XOR gate',
            '7474': 'Dual D flip-flop',
            '7476': 'Dual JK flip-flop',
            '74138': '3-to-8 line decoder',
            '74139': 'Dual 2-to-4 line decoder',
            '74147': '10-to-4 priority encoder',
            '74153': 'Dual 4-to-1 multiplexer',
            '7447': 'BCD to 7-segment decoder',
            '7485': '4-bit magnitude comparator',
            '7490': 'Decade counter',
            '7493': '4-bit binary counter',
            '74121': 'Monostable multivibrator',
            '74245': 'Octal bus transceiver',
            '555': 'Timer IC',
            '4017': 'Decade counter/divider'
        }
        return descriptions.get(ic_type, 'IC component')
    
    def _generate_port_connections(self, comp: Dict, io_to_net: Dict) -> str:
        """Generate port connection string for a component"""
        ic_type = comp['type']
        
        # Common pin configurations for ICs
        pin_configs = {
            '7400': {'inputs': ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'], 
                     'outputs': ['1Y', '2Y', '3Y', '4Y'],
                     'power': ['VCC', 'GND']},
            '7402': {'inputs': ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'], 
                     'outputs': ['1Y', '2Y', '3Y', '4Y'],
                     'power': ['VCC', 'GND']},
            '7404': {'inputs': ['1A', '2A', '3A', '4A', '5A', '6A'], 
                     'outputs': ['1Y', '2Y', '3Y', '4Y', '5Y', '6Y'],
                     'power': ['VCC', 'GND']},
            '7408': {'inputs': ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'], 
                     'outputs': ['1Y', '2Y', '3Y', '4Y'],
                     'power': ['VCC', 'GND']},
            '7432': {'inputs': ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'], 
                     'outputs': ['1Y', '2Y', '3Y', '4Y'],
                     'power': ['VCC', 'GND']},
            '7486': {'inputs': ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'], 
                     'outputs': ['1Y', '2Y', '3Y', '4Y'],
                     'power': ['VCC', 'GND']},
        }
        
        config = pin_configs.get(ic_type)
        
        if config:
            lines = []
            # Connect available inputs to switch nets
            input_nets = [io_to_net.get(inp, inp) for inp in self.inputs]
            output_nets = [io_to_net.get(out, out) for out in self.outputs]
            
            # For gate ICs, connect first gate's inputs to available inputs
            if 'inputs' in config and input_nets:
                for i, inp_port in enumerate(config['inputs'][:len(input_nets)]):
                    if i < len(input_nets):
                        lines.append(f"        .{inp_port}({input_nets[i]})")
            
            # Connect first output to LED
            if 'outputs' in config and output_nets:
                lines.append(f"        .{config['outputs'][0]}({output_nets[0]})")
            
            # VCC and GND
            lines.append(f"        .VCC(1'b1)")
            lines.append(f"        .GND(1'b0)")
            
            return ",\n".join(lines) + "\n"
        else:
            # Generic placeholder
            return f"        // Configure pin connections for {ic_type}\n"
    
    def _generate_ic_modules(self) -> str:
        """Generate stub module definitions for ICs used"""
        if not self.components:
            return ""
        
        modules = "\n\n// ============================================\n"
        modules += "// IC Module Templates (implement or replace with your library)\n"
        modules += "// ============================================\n\n"
        
        # Track which IC types we've already generated
        generated = set()
        
        for comp in self.components:
            ic_type = comp['type']
            valid_type = comp['valid_type']
            
            if valid_type in generated:
                continue
            generated.add(valid_type)
            
            modules += f"// {self._get_ic_description(ic_type)}\n"
            modules += f"module {valid_type} (\n"
            
            # Generate generic port list based on IC type
            if ic_type in ['7400', '7402', '7408', '7432', '7486']:
                modules += "    input wire 1A, 1B,\n"
                modules += "    output wire 1Y,\n"
                modules += "    input wire 2A, 2B,\n"
                modules += "    output wire 2Y,\n"
                modules += "    input wire 3A, 3B,\n"
                modules += "    output wire 3Y,\n"
                modules += "    input wire 4A, 4B,\n"
                modules += "    output wire 4Y,\n"
                modules += "    input wire VCC, GND\n"
            elif ic_type == '7404':
                modules += "    input wire 1A, 2A, 3A, 4A, 5A, 6A,\n"
                modules += "    output wire 1Y, 2Y, 3Y, 4Y, 5Y, 6Y,\n"
                modules += "    input wire VCC, GND\n"
            else:
                modules += "    // Add port definitions based on datasheet\n"
            
            modules += ");\n"
            
            # Add basic implementation
            if ic_type == '7400':
                modules += "    // NAND gate implementation\n"
                modules += "    assign 1Y = ~(1A & 1B);\n"
                modules += "    assign 2Y = ~(2A & 2B);\n"
                modules += "    assign 3Y = ~(3A & 3B);\n"
                modules += "    assign 4Y = ~(4A & 4B);\n"
            elif ic_type == '7402':
                modules += "    // NOR gate implementation\n"
                modules += "    assign 1Y = ~(1A | 1B);\n"
                modules += "    assign 2Y = ~(2A | 2B);\n"
                modules += "    assign 3Y = ~(3A | 3B);\n"
                modules += "    assign 4Y = ~(4A | 4B);\n"
            elif ic_type == '7408':
                modules += "    // AND gate implementation\n"
                modules += "    assign 1Y = 1A & 1B;\n"
                modules += "    assign 2Y = 2A & 2B;\n"
                modules += "    assign 3Y = 3A & 3B;\n"
                modules += "    assign 4Y = 4A & 4B;\n"
            elif ic_type == '7432':
                modules += "    // OR gate implementation\n"
                modules += "    assign 1Y = 1A | 1B;\n"
                modules += "    assign 2Y = 2A | 2B;\n"
                modules += "    assign 3Y = 3A | 3B;\n"
                modules += "    assign 4Y = 4A | 4B;\n"
            elif ic_type == '7486':
                modules += "    // XOR gate implementation\n"
                modules += "    assign 1Y = 1A ^ 1B;\n"
                modules += "    assign 2Y = 2A ^ 2B;\n"
                modules += "    assign 3Y = 3A ^ 3B;\n"
                modules += "    assign 4Y = 4A ^ 4B;\n"
            elif ic_type == '7404':
                modules += "    // Inverter implementation\n"
                modules += "    assign 1Y = ~1A;\n"
                modules += "    assign 2Y = ~2A;\n"
                modules += "    assign 3Y = ~3A;\n"
                modules += "    assign 4Y = ~4A;\n"
                modules += "    assign 5Y = ~5A;\n"
                modules += "    assign 6Y = ~6A;\n"
            else:
                modules += "    // TODO: Implement logic based on datasheet\n"
            
            modules += "endmodule\n\n"
        
        return modules
    
    def generate_vhdl(self, entity_name: str = "circuit_design") -> str:
        """Generate VHDL code from the circuit"""
        
        entity_name = self._make_valid_identifier(entity_name)
        io_to_net = self._get_io_connections()
        
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
        
        if io_ports:
            vhdl += ";\n".join(io_ports) + "\n"
        else:
            vhdl += "        -- No I/O defined\n"
        
        vhdl += f"    );\n"
        vhdl += f"end {entity_name};\n\n"
        
        # Architecture
        vhdl += f"architecture structural of {entity_name} is\n"
        
        # Component declarations
        generated_components = set()
        if self.components:
            vhdl += "\n    -- Component declarations\n"
            for comp in self.components:
                if comp['valid_type'] not in generated_components:
                    generated_components.add(comp['valid_type'])
                    vhdl += f"    component {comp['valid_type']}\n"
                    vhdl += f"        port(\n"
                    vhdl += f"            A, B : in std_logic;\n"
                    vhdl += f"            Y : out std_logic\n"
                    vhdl += f"        );\n"
                    vhdl += f"    end component;\n\n"
        
        # Signal declarations
        internal_nets = self._get_unique_nets()
        if internal_nets:
            vhdl += "    -- Internal signals\n"
            for net in internal_nets:
                vhdl += f"    signal {net} : std_logic;\n"
        
        vhdl += "\nbegin\n\n"
        
        # Component instantiations
        if self.components:
            vhdl += "    -- Component instantiations\n"
            for comp in self.components:
                instance = comp['instance_name']
                ic_type = comp['valid_type']
                vhdl += f"    {instance}: {ic_type}\n"
                vhdl += f"        port map(\n"
                
                # Try to map I/O
                if self.inputs:
                    vhdl += f"            A => {self.inputs[0]},\n"
                if len(self.inputs) > 1:
                    vhdl += f"            B => {self.inputs[1]},\n"
                elif self.inputs:
                    vhdl += f"            B => '0',\n"
                if self.outputs:
                    vhdl += f"            Y => {self.outputs[0]}\n"
                else:
                    vhdl += f"            Y => open\n"
                
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
