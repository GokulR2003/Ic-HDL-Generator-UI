const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── ICs ─────────────────────────────────────────────────────
export const IcsApi = {
  get: (partNumber: string) => request<IcData>(`/ics/${partNumber}`),
  list: (limit = 100) => request<IcData[]>(`/ics/?limit=${limit}`),
};

// ── Circuits ─────────────────────────────────────────────────
export const CircuitsApi = {
  list: () => request<CircuitSummary[]>('/circuits/'),
  get:  (id: number) => request<Circuit>(`/circuits/${id}`),
  create: (payload: CreateCircuitPayload) =>
    request<Circuit>('/circuits/', { method: 'POST', body: JSON.stringify(payload) }),
  delete: (id: number) =>
    request<void>(`/circuits/${id}`, { method: 'DELETE' }),
};

// ── Generator ────────────────────────────────────────────────
export const GeneratorApi = {
  fromSchematic: (payload: SchematicPayload) =>
    request<HdlResult>('/generator/generate-from-schematic', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  testbench: (payload: TestbenchPayload) =>
    request<TestbenchResult>('/generator/testbench', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  truthTable: (payload: TruthTablePayload) =>
    request<TruthTableResult>('/generator/truth-table', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  validate: (payload: { circuit_data: unknown; module_name: string }) =>
    request<ValidateResult>('/generator/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ── Types ────────────────────────────────────────────────────
export interface IcData {
  part_number: string;
  description?: string;
  pins_configuration?: { pin_map?: Record<string, number> };
}

export interface CircuitSummary {
  id: number;
  name: string;
  created_at?: string;
}

export interface Circuit extends CircuitSummary {
  design_data: { objects: unknown; wires?: SerializedWire[] };
}

export interface CreateCircuitPayload {
  name: string;
  description: string | null;
  design_data: { objects: unknown; wires: SerializedWire[] };
}

export interface SerializedWire {
  startParentId: string | null;
  startPinIndex: number | null;
  startIsIO: boolean;
  startPortId: string | null;
  endParentId: string | null;
  endPinIndex: number | null;
  endIsIO: boolean;
  endPortId: string | null;
}

export interface SchematicPayload {
  circuit_data: unknown;
  language: 'verilog' | 'vhdl';
  module_name: string;
}

export interface HdlResult {
  hdl_code: string;
  filename: string;
  language?: string;
}

export interface TestbenchPayload {
  circuit_data: unknown;
  module_name: string;
}

export interface TestbenchResult {
  testbench_code: string;
  filename: string;
}

export interface TruthTablePayload {
  circuit_data: unknown;
  max_rows?: number;
}

export interface TruthTableRow {
  inputs: boolean[];
  outputs: boolean[];
}

export interface TruthTableResult {
  inputs: string[];
  outputs: string[];
  rows: TruthTableRow[];
  capped: boolean;
  total_rows: number;
}

export interface ValidateResult {
  valid: boolean;
  errors: { code: string; message: string }[];
  warnings: { code: string; message: string }[];
  stats: { components: number; wires: number; inputs: number; outputs: number };
}
