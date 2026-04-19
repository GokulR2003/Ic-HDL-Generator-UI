export type PinDir = 'input' | 'output' | 'power' | 'nc';

export interface PinDef {
  name: string;
  dir: PinDir;
}

export interface IcDef {
  desc: string;
  pinCount: number;
  pins: Record<number, PinDef>;
}

// Mirrors Python's ICPinDatabase — single source of truth in JS
export const IC_DB: Record<string, IcDef> = {
  '7400': {
    desc: 'Quad 2-input NAND',
    pinCount: 14,
    pins: {
      1: { name: 'A1', dir: 'input' },  2: { name: 'B1', dir: 'input' },
      3: { name: 'Y1', dir: 'output' }, 4: { name: 'A2', dir: 'input' },
      5: { name: 'B2', dir: 'input' },  6: { name: 'Y2', dir: 'output' },
      7: { name: 'GND', dir: 'power' }, 8: { name: 'Y3', dir: 'output' },
      9: { name: 'A3', dir: 'input' },  10: { name: 'B3', dir: 'input' },
      11: { name: 'Y4', dir: 'output' },12: { name: 'A4', dir: 'input' },
      13: { name: 'B4', dir: 'input' }, 14: { name: 'VCC', dir: 'power' },
    },
  },
  '7402': {
    desc: 'Quad 2-input NOR',
    pinCount: 14,
    pins: {
      1: { name: 'Y1', dir: 'output' }, 2: { name: 'A1', dir: 'input' },
      3: { name: 'B1', dir: 'input' },  4: { name: 'Y2', dir: 'output' },
      5: { name: 'A2', dir: 'input' },  6: { name: 'B2', dir: 'input' },
      7: { name: 'GND', dir: 'power' }, 8: { name: 'A3', dir: 'input' },
      9: { name: 'B3', dir: 'input' },  10: { name: 'Y3', dir: 'output' },
      11: { name: 'A4', dir: 'input' }, 12: { name: 'B4', dir: 'input' },
      13: { name: 'Y4', dir: 'output' },14: { name: 'VCC', dir: 'power' },
    },
  },
  '7404': {
    desc: 'Hex Inverter',
    pinCount: 14,
    pins: {
      1: { name: 'A1', dir: 'input' },  2: { name: 'Y1', dir: 'output' },
      3: { name: 'A2', dir: 'input' },  4: { name: 'Y2', dir: 'output' },
      5: { name: 'A3', dir: 'input' },  6: { name: 'Y3', dir: 'output' },
      7: { name: 'GND', dir: 'power' }, 8: { name: 'Y4', dir: 'output' },
      9: { name: 'A4', dir: 'input' },  10: { name: 'Y5', dir: 'output' },
      11: { name: 'A5', dir: 'input' }, 12: { name: 'Y6', dir: 'output' },
      13: { name: 'A6', dir: 'input' }, 14: { name: 'VCC', dir: 'power' },
    },
  },
  '7408': {
    desc: 'Quad 2-input AND',
    pinCount: 14,
    pins: {
      1: { name: 'A1', dir: 'input' },  2: { name: 'B1', dir: 'input' },
      3: { name: 'Y1', dir: 'output' }, 4: { name: 'A2', dir: 'input' },
      5: { name: 'B2', dir: 'input' },  6: { name: 'Y2', dir: 'output' },
      7: { name: 'GND', dir: 'power' }, 8: { name: 'Y3', dir: 'output' },
      9: { name: 'A3', dir: 'input' },  10: { name: 'B3', dir: 'input' },
      11: { name: 'Y4', dir: 'output' },12: { name: 'A4', dir: 'input' },
      13: { name: 'B4', dir: 'input' }, 14: { name: 'VCC', dir: 'power' },
    },
  },
  '7432': {
    desc: 'Quad 2-input OR',
    pinCount: 14,
    pins: {
      1: { name: 'A1', dir: 'input' },  2: { name: 'B1', dir: 'input' },
      3: { name: 'Y1', dir: 'output' }, 4: { name: 'A2', dir: 'input' },
      5: { name: 'B2', dir: 'input' },  6: { name: 'Y2', dir: 'output' },
      7: { name: 'GND', dir: 'power' }, 8: { name: 'Y3', dir: 'output' },
      9: { name: 'A3', dir: 'input' },  10: { name: 'B3', dir: 'input' },
      11: { name: 'Y4', dir: 'output' },12: { name: 'A4', dir: 'input' },
      13: { name: 'B4', dir: 'input' }, 14: { name: 'VCC', dir: 'power' },
    },
  },
  '7486': {
    desc: 'Quad 2-input XOR',
    pinCount: 14,
    pins: {
      1: { name: 'A1', dir: 'input' },  2: { name: 'B1', dir: 'input' },
      3: { name: 'Y1', dir: 'output' }, 4: { name: 'A2', dir: 'input' },
      5: { name: 'B2', dir: 'input' },  6: { name: 'Y2', dir: 'output' },
      7: { name: 'GND', dir: 'power' }, 8: { name: 'Y3', dir: 'output' },
      9: { name: 'A3', dir: 'input' },  10: { name: 'B3', dir: 'input' },
      11: { name: 'Y4', dir: 'output' },12: { name: 'A4', dir: 'input' },
      13: { name: 'B4', dir: 'input' }, 14: { name: 'VCC', dir: 'power' },
    },
  },
};

export const PIN_COLORS: Record<PinDir, string> = {
  input:  '#4fa3ff',
  output: '#f5a623',
  power:  '#ff5f6d',
  nc:     '#4a6180',
};

export const IC_CATEGORIES: Record<string, string[]> = {
  'Logic Gates':    ['7400', '7402', '7404', '7408', '7432', '7486'],
  'Flip-Flops':     ['7474', '7476'],
  'Counters':       ['7490', '7493'],
  'Decoders/Mux':   ['74138', '74139', '74147', '74153'],
  'Display':        ['7447'],
  'Comparator':     ['7485'],
  'Timer/Misc':     ['555', '4017', '74121', '74245'],
};
