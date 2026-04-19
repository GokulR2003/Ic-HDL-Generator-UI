"""
JS-style in-process gate evaluator for 74xx combinational circuits.

Usage:
    ev = CircuitEvaluator(circuit_data)
    result = ev.evaluate({"sw_0": True, "sw_1": False})
    table = generate_truth_table(circuit_data, max_rows=256)
"""

from functools import reduce
from typing import Any
from services.schematic_hdl_generator import SchematicHDLGenerator, ICPinDatabase


# ── Gate functions ─────────────────────────────────────────────
def _eval_gate(func: str, inputs: list[bool]) -> bool:
    if not inputs:
        return False
    if func == 'and':
        return all(inputs)
    if func == 'or':
        return any(inputs)
    if func == 'not':
        return not inputs[0]
    if func == 'nand':
        return not all(inputs)
    if func == 'nor':
        return not any(inputs)
    if func == 'xor':
        return bool(reduce(lambda a, b: a ^ b, inputs))
    if func == 'xnor':
        return not bool(reduce(lambda a, b: a ^ b, inputs))
    return False


class CircuitEvaluator:
    """Evaluates combinational 74xx circuit logic for a set of input values."""

    def __init__(self, circuit_data: dict[str, Any]):
        self.gen = SchematicHDLGenerator(circuit_data)
        # Each entry: (func_str, [input_net_names], output_net_name)
        self.gates: list[tuple[str, list[str], str]] = []
        self._build_graph()

    def _build_graph(self) -> None:
        for comp in self.gen.components:
            ic_type = comp["type"]
            ic_def = ICPinDatabase.IC_PIN_DEFINITIONS.get(ic_type, {})
            func = ic_def.get("function", "")
            gate_groups = ic_def.get("gate_groups", [])
            connections = self.gen._get_component_pin_connections(comp)

            for group in gate_groups:
                in_pins, out_pin = group  # (('A1','B1'), 'Y1')
                if out_pin not in connections:
                    continue
                out_net = connections[out_pin]
                in_nets = [connections[p] for p in in_pins if p in connections]
                if len(in_nets) != len(in_pins):
                    continue  # skip partially-connected gates
                self.gates.append((func, in_nets, out_net))

    def evaluate(self, input_values: dict[str, bool]) -> dict[str, bool]:
        """
        Propagate input values through the circuit.
        Returns a net-value dict (includes inputs + all driven nets).
        """
        nets: dict[str, bool | None] = {k: v for k, v in input_values.items()}

        # Iterative forward propagation (converges in O(depth) passes)
        for _ in range(20):
            changed = False
            for func, in_nets, out_net in self.gates:
                in_vals = [nets.get(n) for n in in_nets]
                if any(v is None for v in in_vals):
                    continue
                result = _eval_gate(func, in_vals)  # type: ignore[arg-type]
                if nets.get(out_net) != result:
                    nets[out_net] = result
                    changed = True
            if not changed:
                break

        return {k: bool(v) for k, v in nets.items() if v is not None}


def generate_truth_table(
    circuit_data: dict[str, Any],
    max_rows: int = 256,
) -> dict[str, Any]:
    """
    Generate a full truth table for the circuit.

    Returns:
        inputs:    ordered list of input port names
        outputs:   ordered list of output port names
        rows:      list of { inputs: [bool], outputs: [bool] }
        capped:    True if 2^N > max_rows (table was truncated)
        total_rows: 2^N (actual number of rows if not capped)
    """
    ev = CircuitEvaluator(circuit_data)
    inputs = ev.gen.inputs
    outputs = ev.gen.outputs

    n = len(inputs)
    total = 2 ** n if n > 0 else 0
    capped = total > max_rows
    to_eval = min(total, max_rows)

    rows = []
    for i in range(to_eval):
        in_vals: dict[str, bool] = {}
        for j, name in enumerate(inputs):
            in_vals[name] = bool((i >> (n - 1 - j)) & 1)

        net_vals = ev.evaluate(in_vals)
        rows.append({
            "inputs":  [in_vals.get(name, False) for name in inputs],
            "outputs": [net_vals.get(name, False) for name in outputs],
        })

    return {
        "inputs":    inputs,
        "outputs":   outputs,
        "rows":      rows,
        "capped":    capped,
        "total_rows": total,
    }
