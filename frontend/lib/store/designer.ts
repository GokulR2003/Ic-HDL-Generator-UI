'use client';
import { create } from 'zustand';
import type { SerializedWire } from '@/lib/api';

export type Tool = 'select' | 'wire' | 'delete' | 'pan';

export interface ComponentData {
  id: string;
  type: 'ic' | 'input' | 'output';
  partNumber?: string;
  label: string;
  x: number;
  y: number;
}

export interface WireData {
  startParentId: string | null;
  startPinIndex: number | null;
  startIsIO: boolean;
  startPortId: string | null;
  endParentId: string | null;
  endPinIndex: number | null;
  endIsIO: boolean;
  endPortId: string | null;
}

interface DesignerState {
  tool: Tool;
  selectedId: string | null;
  moduleName: string;
  components: Record<string, ComponentData>;
  wires: WireData[];
  zoom: number;
  cursorX: number;
  cursorY: number;

  // Actions
  setTool: (t: Tool) => void;
  setSelected: (id: string | null) => void;
  setModuleName: (name: string) => void;
  addComponent: (c: ComponentData) => void;
  updateComponent: (id: string, patch: Partial<ComponentData>) => void;
  removeComponent: (id: string) => void;
  addWire: (w: WireData) => void;
  removeWiresForComponent: (id: string) => void;
  setWires: (wires: WireData[]) => void;
  setZoom: (z: number) => void;
  setCursor: (x: number, y: number) => void;
  clearAll: () => void;
}

export const useDesignerStore = create<DesignerState>((set) => ({
  tool: 'select',
  selectedId: null,
  moduleName: 'my_circuit',
  components: {},
  wires: [],
  zoom: 100,
  cursorX: 0,
  cursorY: 0,

  setTool: (tool) => set({ tool }),
  setSelected: (selectedId) => set({ selectedId }),
  setModuleName: (moduleName) => set({ moduleName }),

  addComponent: (c) =>
    set((s) => ({ components: { ...s.components, [c.id]: c } })),

  updateComponent: (id, patch) =>
    set((s) => ({
      components: {
        ...s.components,
        [id]: { ...s.components[id], ...patch },
      },
    })),

  removeComponent: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.components;
      return { components: rest };
    }),

  addWire: (w) => set((s) => ({ wires: [...s.wires, w] })),

  removeWiresForComponent: (id) =>
    set((s) => ({
      wires: s.wires.filter(
        (w) =>
          w.startParentId !== id &&
          w.endParentId !== id &&
          w.startPortId !== id &&
          w.endPortId !== id
      ),
    })),

  setWires: (wires) => set({ wires }),
  setZoom: (zoom) => set({ zoom }),
  setCursor: (cursorX, cursorY) => set({ cursorX, cursorY }),
  clearAll: () => set({ components: {}, wires: [], selectedId: null }),
}));
