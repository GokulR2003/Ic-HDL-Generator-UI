"""
P5.1 — Golden tests for the schematic HDL generator.

Each test exercises one IC family (7400/7402/7404/7408/7432/7486) through the full
generate_hdl_from_circuit() path. Fixtures use portId-based I/O matching (the format
the Next.js frontend serializes wires in).
"""

import re
import pytest
import sys
import os

# Make sure backend/ is on the path when running from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.schematic_hdl_generator import (
    generate_hdl_from_circuit,
    generate_testbench_from_circuit,
    SchematicHDLGenerator,
    ICPinDatabase,
)


# ── Fixture helpers ────────────────────────────────────────────

def _make_circuit(ic_type: str, input_pins: list[tuple[str, int]], output_pin: str) -> dict:
    """
    Build a minimal single-IC circuit:
    - One IC of `ic_type`
    - One input I/O per entry in `input_pins` (pin_name, pin_number)
    - One output I/O connected to `output_pin`

    Uses portId-based I/O matching (new format).
    """
    io_objects = []
    wires = []

    for i, (pin_name, pin_idx) in enumerate(input_pins):
        io_id = f"io_in_{i}"
        io_objects.append({
            "isIO": True, "ioType": "input",
            "left": 60, "top": 140 + i * 20,
            "id": io_id,
        })
        wires.append({
            "start": {
                "portId": io_id, "isIO": True, "ioType": "input",
                "left": 0, "top": 0,
                "pinName": None, "pinIndex": None, "icType": None,
            },
            "end": {
                "portId": None, "isIO": False,
                "pinName": pin_name, "pinIndex": pin_idx, "icType": ic_type,
                "left": 0, "top": 0, "ioType": None,
            },
        })

    out_id = "io_out_0"
    io_objects.append({
        "isIO": True, "ioType": "output",
        "left": 400, "top": 140,
        "id": out_id,
    })
    wires.append({
        "start": {
            "portId": None, "isIO": False,
            "pinName": output_pin, "pinIndex": None, "icType": ic_type,
            "left": 0, "top": 0, "ioType": None,
        },
        "end": {
            "portId": out_id, "isIO": True, "ioType": "output",
            "left": 0, "top": 0,
            "pinName": None, "pinIndex": None, "icType": None,
        },
    })

    return {
        "objects": {
            "objects": [
                {
                    "type": "group", "left": 200, "top": 160,
                    "objects": [{"type": "text", "text": ic_type}],
                },
                *io_objects,
            ]
        },
        "wires": wires,
    }


# One fixture per IC family
FIXTURES = {
    "7400": _make_circuit("7400", [("A1", 1), ("B1", 2)], "Y1"),  # NAND
    "7402": _make_circuit("7402", [("A1", 2), ("B1", 3)], "Y1"),  # NOR (Y first)
    "7404": _make_circuit("7404", [("A1", 1)], "Y1"),             # Inverter (1 input)
    "7408": _make_circuit("7408", [("A1", 1), ("B1", 2)], "Y1"),  # AND
    "7432": _make_circuit("7432", [("A1", 1), ("B1", 2)], "Y1"),  # OR
    "7486": _make_circuit("7486", [("A1", 1), ("B1", 2)], "Y1"),  # XOR
}


# ── Structure tests ────────────────────────────────────────────

class TestVerilogStructure:
    """Verify that generated Verilog has the required structural elements."""

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_has_module_and_endmodule(self, ic_type):
        code = generate_hdl_from_circuit(FIXTURES[ic_type], "verilog", f"tb_{ic_type}")
        assert "module " in code
        assert "endmodule" in code

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_has_input_ports(self, ic_type):
        code = generate_hdl_from_circuit(FIXTURES[ic_type], "verilog", f"tb_{ic_type}")
        assert re.search(r"\binput\b", code), f"No 'input' in {ic_type} output"

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_has_output_ports(self, ic_type):
        code = generate_hdl_from_circuit(FIXTURES[ic_type], "verilog", f"tb_{ic_type}")
        assert re.search(r"\boutput\b", code), f"No 'output' in {ic_type} output"

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_module_name_in_output(self, ic_type):
        module_name = f"test_{ic_type}"
        code = generate_hdl_from_circuit(FIXTURES[ic_type], "verilog", module_name)
        assert f"module {module_name}" in code

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_ic_module_definition_present(self, ic_type):
        """Generated code should include the IC module definition."""
        code = generate_hdl_from_circuit(FIXTURES[ic_type], "verilog", "top")
        valid_type = re.sub(r"[^a-zA-Z0-9_]", "_", ic_type)
        if ic_type[0].isdigit():
            valid_type = f"IC_{valid_type}"
        assert valid_type in code, f"IC module '{valid_type}' not found in output"

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_no_python_exceptions(self, ic_type):
        """Generator must not raise for valid inputs."""
        code = generate_hdl_from_circuit(FIXTURES[ic_type], "verilog", "top")
        assert isinstance(code, str) and len(code) > 0


class TestVHDLStructure:
    """Verify VHDL output structure."""

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_has_entity_and_architecture(self, ic_type):
        code = generate_hdl_from_circuit(FIXTURES[ic_type], "vhdl", f"e_{ic_type}")
        assert "entity " in code
        assert "architecture " in code
        assert "end " in code

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_ieee_library_present(self, ic_type):
        code = generate_hdl_from_circuit(FIXTURES[ic_type], "vhdl", "top")
        assert "library IEEE" in code


# ── IO matching tests ──────────────────────────────────────────

class TestIOMatching:
    """Verify that portId-based I/O matching wires inputs/outputs correctly."""

    def test_7408_io_names_in_ports(self):
        """7408 circuit should expose sw_0, sw_1, led_0 as ports."""
        code = generate_hdl_from_circuit(FIXTURES["7408"], "verilog", "and_gate")
        # The generator names inputs sw_0, sw_1 and output led_0
        assert "sw_0" in code or "sw" in code, "Expected input port name not found"
        assert "led_0" in code or "led" in code, "Expected output port name not found"

    def test_7404_single_input(self):
        """7404 inverter has exactly one input."""
        gen = SchematicHDLGenerator(FIXTURES["7404"])
        assert len(gen.inputs) == 1
        assert len(gen.outputs) == 1

    def test_two_input_gates_have_two_inputs(self):
        for ic in ["7400", "7402", "7408", "7432", "7486"]:
            gen = SchematicHDLGenerator(FIXTURES[ic])
            assert len(gen.inputs) == 2, f"{ic}: expected 2 inputs, got {len(gen.inputs)}"
            assert len(gen.outputs) == 1, f"{ic}: expected 1 output, got {len(gen.outputs)}"


# ── Testbench tests ────────────────────────────────────────────

class TestTestbench:
    """Verify testbench template generation."""

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_testbench_has_timescale(self, ic_type):
        tb = generate_testbench_from_circuit(FIXTURES[ic_type], ic_type)
        assert "`timescale" in tb

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_testbench_has_module_and_endmodule(self, ic_type):
        tb = generate_testbench_from_circuit(FIXTURES[ic_type], ic_type)
        assert "module tb_" in tb
        assert "endmodule" in tb

    @pytest.mark.parametrize("ic_type", FIXTURES.keys())
    def test_testbench_has_dumpfile(self, ic_type):
        tb = generate_testbench_from_circuit(FIXTURES[ic_type], ic_type)
        assert "$dumpfile" in tb

    def test_7408_testbench_has_four_vectors(self):
        """2-input gate → 4 test vectors (2^2)."""
        tb = generate_testbench_from_circuit(FIXTURES["7408"], "7408")
        # Count lines that assign inputs and end with #10
        vector_lines = [l for l in tb.splitlines() if "#10" in l]
        assert len(vector_lines) == 4

    def test_7404_testbench_has_two_vectors(self):
        """1-input gate → 2 test vectors (2^1)."""
        tb = generate_testbench_from_circuit(FIXTURES["7404"], "7404")
        vector_lines = [l for l in tb.splitlines() if "#10" in l]
        assert len(vector_lines) == 2


# ── ICPinDatabase tests ────────────────────────────────────────

class TestICPinDatabase:
    """Verify the pin database is consistent."""

    def test_all_six_families_present(self):
        expected = {"7400", "7402", "7404", "7408", "7432", "7486"}
        assert expected.issubset(ICPinDatabase.IC_PIN_DEFINITIONS.keys())

    @pytest.mark.parametrize("ic_type", ["7400", "7402", "7404", "7408", "7432", "7486"])
    def test_all_ics_have_function_key(self, ic_type):
        assert "function" in ICPinDatabase.IC_PIN_DEFINITIONS[ic_type]

    @pytest.mark.parametrize("ic_type", ["7400", "7402", "7404", "7408", "7432", "7486"])
    def test_all_ics_have_14_pins(self, ic_type):
        pin_def = ICPinDatabase.IC_PIN_DEFINITIONS[ic_type]
        int_keys = [k for k in pin_def if isinstance(k, int)]
        assert len(int_keys) == 14, f"{ic_type}: expected 14 pins, got {len(int_keys)}"

    @pytest.mark.parametrize("ic_type", ["7400", "7402", "7404", "7408", "7432", "7486"])
    def test_ic_has_power_pins(self, ic_type):
        ports = ICPinDatabase.get_ic_ports(ic_type)
        assert "VCC" in ports["power"] or "GND" in ports["power"]

    def test_get_pin_name_returns_valid_identifier(self):
        name = ICPinDatabase.get_pin_name_from_number("7408", 1)
        assert re.match(r"^[a-zA-Z_]\w*$", name), f"Invalid identifier: {name}"
