'use client';
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Cpu, MousePointer2, Pencil, Grid2x2, Table2, Terminal,
  Undo2, Redo2, Maximize2, Save, FolderOpen,
} from 'lucide-react';
import { useDesignerStore } from '@/lib/store/designer';
import { useCanvas } from '@/hooks/useCanvas';
import { GeneratorApi } from '@/lib/api';
import type { HdlResult, TestbenchResult, TruthTableResult } from '@/lib/api';
import { TopBar } from '@/components/designer/TopBar';
import { Palette } from '@/components/designer/Palette';
import { Toolbar } from '@/components/designer/Toolbar';
import { Inspector } from '@/components/designer/Inspector';
import { StatusBar } from '@/components/designer/StatusBar';
import { CodePanel } from '@/components/designer/CodePanel';
import { TruthTablePanel } from '@/components/designer/TruthTablePanel';
import { CommandPalette, type Command } from '@/components/designer/CommandPalette';
import { CircuitsApi } from '@/lib/api';

export default function DesignerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    fabricRef, addIC, addIO, deleteSelected,
    serializeCanvas, loadCanvas,
    undo, redo, fitView, resetView,
  } = useCanvas(containerRef);

  const { setTool, moduleName } = useDesignerStore();

  // ── Code panel state ────────────────────────────────────────
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [hdlResult, setHdlResult] = useState<HdlResult | null>(null);
  const [hdlLang, setHdlLang] = useState<'verilog' | 'vhdl'>('verilog');
  const [exporting, setExporting] = useState(false);

  // ── Truth table state ───────────────────────────────────────
  const [ttOpen, setTtOpen] = useState(false);
  const [ttResult, setTtResult] = useState<TruthTableResult | null>(null);
  const [ttLoading, setTtLoading] = useState(false);

  // ── Command palette state ───────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ── Wire serialization helper ───────────────────────────────
  const buildPayload = useCallback((lang: 'verilog' | 'vhdl') => {
    const { objects, wires } = serializeCanvas();
    const { components } = useDesignerStore.getState();
    return {
      circuit_data: {
        objects,
        wires: wires.map((w) => {
          const startComp = w.startIsIO && w.startPortId ? components[w.startPortId] : null;
          const endComp   = w.endIsIO   && w.endPortId   ? components[w.endPortId]   : null;
          return {
            start: {
              portId: w.startPortId, left: 0, top: 0,
              pinName: null, pinIndex: w.startPinIndex,
              icType: null, isIO: w.startIsIO,
              ioType: startComp ? startComp.type : null,
            },
            end: {
              portId: w.endPortId, left: 0, top: 0,
              pinName: null, pinIndex: w.endPinIndex,
              icType: null, isIO: w.endIsIO,
              ioType: endComp ? endComp.type : null,
            },
          };
        }),
      },
      language: lang,
      module_name: moduleName || 'my_circuit',
    };
  }, [serializeCanvas, moduleName]);

  // ── Export HDL ──────────────────────────────────────────────
  const handleExportHDL = useCallback(async (lang: 'verilog' | 'vhdl' = hdlLang) => {
    setExporting(true);
    try {
      const result = await GeneratorApi.fromSchematic(buildPayload(lang));
      setHdlResult(result);
      setHdlLang(lang);
      setCodePanelOpen(true);
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }, [buildPayload, hdlLang]);

  const handleLangChange = useCallback((lang: 'verilog' | 'vhdl') => {
    setHdlLang(lang);
    handleExportHDL(lang);
  }, [handleExportHDL]);

  const handleGetTestbench = useCallback(async (): Promise<TestbenchResult> => {
    const payload = buildPayload(hdlLang);
    return GeneratorApi.testbench({
      circuit_data: payload.circuit_data,
      module_name: moduleName || 'my_circuit',
    });
  }, [buildPayload, moduleName, hdlLang]);

  // ── Truth table ─────────────────────────────────────────────
  const handleShowTruthTable = useCallback(async () => {
    setTtOpen(true);
    setTtLoading(true);
    setTtResult(null);
    try {
      const payload = buildPayload(hdlLang);
      const result = await GeneratorApi.truthTable({ circuit_data: payload.circuit_data });
      setTtResult(result);
    } catch (e: any) {
      toast.error(`Truth table error: ${e.message}`);
      setTtOpen(false);
    } finally {
      setTtLoading(false);
    }
  }, [buildPayload, hdlLang]);

  // ── Save / Load ─────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const name = moduleName || 'my_circuit';
    try {
      const { objects, wires } = serializeCanvas();
      await CircuitsApi.create({ name, description: null, design_data: { objects, wires } });
      toast.success(`Saved as "${name}"`);
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`);
    }
  }, [serializeCanvas, moduleName]);

  const handleLoad = useCallback(async () => {
    try {
      const circuits = await CircuitsApi.list();
      if (!circuits.length) { toast.warning('No saved circuits.'); return; }
      const latest = circuits[circuits.length - 1];
      const circuit = await CircuitsApi.get(latest.id);
      const dd = circuit.design_data;
      loadCanvas(dd.objects, dd.wires || []);
      toast.success(`Loaded "${latest.name}"`);
    } catch (e: any) {
      toast.error(`Load failed: ${e.message}`);
    }
  }, [loadCanvas]);

  // ── Drag-drop ───────────────────────────────────────────────
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
      const type = e.dataTransfer.getData('type');
      const name = e.dataTransfer.getData('name');
      const rect = containerRef.current.getBoundingClientRect();
      const canvas = fabricRef.current;
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      if (canvas) {
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        x = (x - vpt[4]) / vpt[0];
        y = (y - vpt[5]) / vpt[3];
      }
      if (type === 'ic') await addIC(name, x, y);
      else if (type === 'input')  addIO('input', x, y);
      else if (type === 'output') addIO('output', x, y);
    },
    [addIC, addIO, fabricRef]
  );

  // ── Commands for palette ────────────────────────────────────
  const CANVAS_CENTER = { x: 300, y: 200 };
  const commands = useMemo<Command[]>(() => [
    // Add IC
    ...(['7400','7402','7404','7408','7432','7486'] as const).map((ic) => ({
      id: `add-${ic}`, category: 'Add IC',
      label: `Add ${ic}`,
      description: { '7400':'NAND','7402':'NOR','7404':'Inverter','7408':'AND','7432':'OR','7486':'XOR' }[ic],
      icon: <Cpu size={13} />,
      action: () => addIC(ic, CANVAS_CENTER.x, CANVAS_CENTER.y),
    })),
    // Add I/O
    { id: 'add-input',  category: 'Add Port', label: 'Add Input Port',  icon: <MousePointer2 size={13} />, action: () => addIO('input',  CANVAS_CENTER.x - 100, CANVAS_CENTER.y) },
    { id: 'add-output', category: 'Add Port', label: 'Add Output Port', icon: <MousePointer2 size={13} />, action: () => addIO('output', CANVAS_CENTER.x + 100, CANVAS_CENTER.y) },
    // Tools
    { id: 'tool-select', category: 'Tools', label: 'Select Tool',  shortcut: 'V',     icon: <MousePointer2 size={13} />, action: () => setTool('select') },
    { id: 'tool-wire',   category: 'Tools', label: 'Wire Tool',    shortcut: 'W',     icon: <Pencil size={13} />,       action: () => setTool('wire') },
    { id: 'tool-pan',    category: 'Tools', label: 'Pan Tool',                        icon: <Grid2x2 size={13} />,      action: () => setTool('pan') },
    // History
    { id: 'undo', category: 'History', label: 'Undo', shortcut: 'Ctrl+Z', icon: <Undo2 size={13} />,  action: undo },
    { id: 'redo', category: 'History', label: 'Redo', shortcut: 'Ctrl+Y', icon: <Redo2 size={13} />,  action: redo },
    // View
    { id: 'fit-view',   category: 'View', label: 'Fit View',   shortcut: 'F', icon: <Maximize2 size={13} />, action: fitView },
    { id: 'reset-view', category: 'View', label: 'Reset View', shortcut: '0',                                action: resetView },
    // Circuit
    { id: 'save',        category: 'Circuit', label: 'Save Circuit',      shortcut: 'Ctrl+S', icon: <Save size={13} />,       action: handleSave },
    { id: 'load',        category: 'Circuit', label: 'Load Circuit',                          icon: <FolderOpen size={13} />, action: handleLoad },
    { id: 'delete',      category: 'Circuit', label: 'Delete Selected',   shortcut: 'Del',                                    action: deleteSelected },
    // Export
    { id: 'export-hdl',    category: 'Export', label: 'Export HDL',      icon: <Terminal size={13} />, action: () => handleExportHDL(hdlLang) },
    { id: 'truth-table',   category: 'Export', label: 'Show Truth Table', icon: <Table2 size={13} />,  action: handleShowTruthTable },
  ], [addIC, addIO, setTool, undo, redo, fitView, resetView,
      handleSave, handleLoad, deleteSelected, handleExportHDL, handleShowTruthTable, hdlLang]);

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(true); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); return; }

      if (e.key === 'v' || e.key === 'V') setTool('select');
      if (e.key === 'w' || e.key === 'W') setTool('wire');
      if (e.key === 'Escape') { setTool('select'); setCodePanelOpen(false); setTtOpen(false); setPaletteOpen(false); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
      if (e.key === 'f' || e.key === 'F') fitView();
      if (e.key === '0') resetView();
      if (e.key === 't' || e.key === 'T') handleShowTruthTable();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTool, deleteSelected, undo, redo, fitView, resetView, handleSave, handleShowTruthTable]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        onSave={serializeCanvas}
        onLoad={(objects, wires) => loadCanvas(objects, wires)}
        onExportHDL={() => handleExportHDL(hdlLang)}
        exporting={exporting}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Palette onDragStart={() => {}} />
        <Toolbar onUndo={undo} onRedo={redo} onFitView={fitView} onResetView={resetView} />

        <div
          ref={containerRef}
          className="canvas-grid"
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        />

        <Inspector />
      </div>

      <StatusBar />

      {/* Overlays */}
      <CodePanel
        open={codePanelOpen}
        result={hdlResult}
        language={hdlLang}
        generating={exporting}
        onClose={() => setCodePanelOpen(false)}
        onLangChange={handleLangChange}
        onGetTestbench={handleGetTestbench}
      />

      <TruthTablePanel
        open={ttOpen}
        result={ttResult}
        loading={ttLoading}
        onClose={() => setTtOpen(false)}
      />

      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
