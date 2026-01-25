import os

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "hdl_templates", "vhdl", "combinational", "basic_gates")
os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Common header
HEADER = """-- ============================================================================
-- Auto-generated VHDL from IC Metadata
-- Part: {{part_number}} - {{ic_name}}
-- Generated: {{timestamp}}
-- ============================================================================

library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity IC_{{part_number}} is
    Port (
        {% for input in ports.inputs %}
        {{input}} : in STD_LOGIC;
        {% endfor %}
        
        {% for output in ports.outputs %}
        {{output}} : out STD_LOGIC;
        {% endfor %}
        
        {% for bidir in ports.bidirectional %}
        {{bidir}} : inout STD_LOGIC;
        {% endfor %}
        
        {% for power in ports.power %}
        {{power}} : in STD_LOGIC
        {% if not loop.last %};{% else %};{% endif %}
        {% endfor %}
    );
end IC_{{part_number}};

architecture Behavioral of IC_{{part_number}} is

begin
"""

FOOTER = """
end Behavioral;
"""

TEMPLATES = {
    "and_quad.vhdltpl": """
    -- Quad 2-input AND gates
    {{ports.outputs[0]}} <= {{ports.inputs[0]}} and {{ports.inputs[1]}};
    {{ports.outputs[1]}} <= {{ports.inputs[2]}} and {{ports.inputs[3]}};
    {{ports.outputs[2]}} <= {{ports.inputs[4]}} and {{ports.inputs[5]}};
    {{ports.outputs[3]}} <= {{ports.inputs[6]}} and {{ports.inputs[7]}};
""",
    "or_quad.vhdltpl": """
    -- Quad 2-input OR gates
    {{ports.outputs[0]}} <= {{ports.inputs[0]}} or {{ports.inputs[1]}};
    {{ports.outputs[1]}} <= {{ports.inputs[2]}} or {{ports.inputs[3]}};
    {{ports.outputs[2]}} <= {{ports.inputs[4]}} or {{ports.inputs[5]}};
    {{ports.outputs[3]}} <= {{ports.inputs[6]}} or {{ports.inputs[7]}};
""",
    "xor_quad.vhdltpl": """
    -- Quad 2-input XOR gates
    {{ports.outputs[0]}} <= {{ports.inputs[0]}} xor {{ports.inputs[1]}};
    {{ports.outputs[1]}} <= {{ports.inputs[2]}} xor {{ports.inputs[3]}};
    {{ports.outputs[2]}} <= {{ports.inputs[4]}} xor {{ports.inputs[5]}};
    {{ports.outputs[3]}} <= {{ports.inputs[6]}} xor {{ports.inputs[7]}};
""",
    "inverter_hex.vhdltpl": """
    -- Hex Inverters
    {{ports.outputs[0]}} <= not {{ports.inputs[0]}};
    {{ports.outputs[1]}} <= not {{ports.inputs[1]}};
    {{ports.outputs[2]}} <= not {{ports.inputs[2]}};
    {{ports.outputs[3]}} <= not {{ports.inputs[3]}};
    {{ports.outputs[4]}} <= not {{ports.inputs[4]}};
    {{ports.outputs[5]}} <= not {{ports.inputs[5]}};
"""
}

def generate():
    for filename, body in TEMPLATES.items():
        path = os.path.join(TEMPLATES_DIR, filename)
        content = HEADER + body + FOOTER
        with open(path, "w") as f:
            f.write(content)
        print(f"Created {filename}")

if __name__ == "__main__":
    generate()
