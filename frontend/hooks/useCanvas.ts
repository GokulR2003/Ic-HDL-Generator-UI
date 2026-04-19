'use client';
import { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { toast } from 'sonner';
import { useDesignerStore } from '@/lib/store/designer';
import { IC_DB, PIN_COLORS } from '@/lib/constants/icPins';
import { IcsApi } from '@/lib/api';
import type { WireData } from '@/lib/store/designer';

// ── Constants ────────────────────────────────────────────────
const CUSTOM_PROPS = [
  'isPort', 'isIO', 'ioType', 'pinIndex', 'pinName', 'icType',
  'parentId', 'relX', 'relY', 'id', 'isWire', 'label',
] as const;

const GRID       = 20;   // P3.1: snap grid size (px)
const PIN_R      = 5;    // pin circle radius
const PIN_SPACING = 20;
const IC_WIDTH   = 100;
const MAX_HISTORY = 50;  // P3.5: undo stack depth

function snapTo(v: number) { return Math.round(v / GRID) * GRID; }
function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Hook ─────────────────────────────────────────────────────
export function useCanvas(containerRef: React.RefObject<HTMLDivElement>) {
  const fabricRef = useRef<fabric.Canvas | null>(null);

  // Wire-draw state (local refs — too fast for store)
  const wireState = useRef({
    drawing: false,
    startPort: null as fabric.Object | null,
    tempWire:  null as fabric.Path | null,
    hoveredPort: null as fabric.Object | null,
  });

  // P3.7: pan state
  const panState = useRef({ active: false, lastX: 0, lastY: 0 });
  const spaceDown = useRef(false);

  // P3.5: undo/redo history (JSON snapshots)
  const history = useRef<string[]>([]);
  const histIdx = useRef(-1);

  const { setSelected, setZoom, setCursor, addComponent, removeComponent,
          removeWiresForComponent, addWire, setWires, clearAll } =
    useDesignerStore.getState();

  const toolRef = useRef(useDesignerStore.getState().tool);

  useEffect(() =>
    useDesignerStore.subscribe((s) => { toolRef.current = s.tool; }),
  []);

  // ── Snapshot helpers (P3.5) ───────────────────────────────
  const takeSnapshot = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = canvas.toJSON(CUSTOM_PROPS as unknown as string[]);
    json.objects = json.objects.filter((o: any) => !o.isWire);
    const wires = useDesignerStore.getState().wires;
    const snap = JSON.stringify({ canvas: json, wires });
    // Truncate redo stack
    history.current = history.current.slice(0, histIdx.current + 1);
    history.current.push(snap);
    if (history.current.length > MAX_HISTORY) history.current.shift();
    histIdx.current = history.current.length - 1;
  }, []);

  // ── Canvas init ───────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const el = document.createElement('canvas');
    containerRef.current.appendChild(el);

    const canvas = new fabric.Canvas(el, {
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
    });
    fabricRef.current = canvas;

    // Resize
    const resize = () => {
      if (!containerRef.current) return;
      canvas.setWidth(containerRef.current.clientWidth);
      canvas.setHeight(containerRef.current.clientHeight);
      canvas.requestRenderAll();
    };
    resize();
    window.addEventListener('resize', resize);

    // ── P3.7: Cursor-centered wheel zoom ──────────────────
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      const z = Math.min(4, Math.max(0.2, canvas.getZoom() * delta));
      canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), z);
      useDesignerStore.getState().setZoom(Math.round(z * 100));
    }, { passive: false });

    // ── P3.7: Middle-mouse / Space+drag pan ───────────────
    canvas.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent;
      if (e.button === 1 || spaceDown.current) {
        panState.current = { active: true, lastX: e.clientX, lastY: e.clientY };
        canvas.defaultCursor = 'grabbing';
        return;
      }
      handleMouseDown(opt);
    });

    canvas.on('mouse:move', (opt) => {
      const e = opt.e as MouseEvent;
      if (panState.current.active) {
        const vpt = canvas.viewportTransform!.slice() as number[];
        vpt[4] += e.clientX - panState.current.lastX;
        vpt[5] += e.clientY - panState.current.lastY;
        canvas.setViewportTransform(vpt as [number,number,number,number,number,number]);
        panState.current.lastX = e.clientX;
        panState.current.lastY = e.clientY;
        return;
      }
      const p = canvas.getPointer(e);
      useDesignerStore.getState().setCursor(Math.round(p.x), Math.round(p.y));
      // Wire rubber-band
      if (wireState.current.drawing && wireState.current.tempWire) {
        updateTempWire(wireState.current.startPort!, p.x, p.y);
      }
    });

    canvas.on('mouse:up', () => {
      if (panState.current.active) {
        panState.current.active = false;
        canvas.defaultCursor = toolRef.current === 'wire' ? 'crosshair' : 'default';
      }
    });

    // ── P3.3: Pin hover validation ────────────────────────
    canvas.on('mouse:over', (opt) => {
      if (toolRef.current !== 'wire') return;
      const target = opt.target as any;
      if (!target?.isPort || !wireState.current.drawing) return;
      wireState.current.hoveredPort = target;
      // Green = valid target (different component), Red = invalid (same pin)
      const valid = target !== wireState.current.startPort &&
                    target.parentId !== (wireState.current.startPort as any)?.parentId;
      target.set({ stroke: valid ? '#3dcc7e' : '#ff5f6d', strokeWidth: 3 });
      canvas.requestRenderAll();
    });

    canvas.on('mouse:out', (opt) => {
      const target = opt.target as any;
      if (!target?.isPort) return;
      if (target === wireState.current.hoveredPort) {
        wireState.current.hoveredPort = null;
        target.set({ stroke: '#0a0f1a', strokeWidth: 1.5 });
        canvas.requestRenderAll();
      }
    });

    // ── P3.1: Snap on drag end ────────────────────────────
    canvas.on('object:modified', (opt) => {
      const obj = opt.target as any;
      if (!obj || obj.isWire || obj.isPort) return;
      const sx = snapTo(obj.left);
      const sy = snapTo(obj.top);
      obj.set({ left: sx, top: sy });
      obj.setCoords();
      // Move sibling pins
      canvas.getObjects().filter((p: any) => p.isPort && !p.isIO && p.parentId === obj.id)
        .forEach((p: any) => {
          p.set({ left: sx + p.relX, top: sy + p.relY });
          p.setCoords();
          updateWiresForPort(p);
        });
      // I/O: if the IO group itself moved
      if (obj.isIO) updateWiresForPort(obj);
      canvas.requestRenderAll();
      takeSnapshot(); // P3.5
    });

    // Selection sync
    canvas.on('selection:created', (opt) => {
      const obj = (opt as any).selected?.[0] as any;
      if (obj?.id) setSelected(obj.id);
    });
    canvas.on('selection:updated', (opt) => {
      const obj = (opt as any).selected?.[0] as any;
      if (obj?.id) setSelected(obj.id);
    });
    canvas.on('selection:cleared', () => setSelected(null));

    // P3.7: keyboard space for pan
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        spaceDown.current = true;
        if (!panState.current.active) canvas.defaultCursor = 'grab';
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false;
        if (!panState.current.active) {
          canvas.defaultCursor = toolRef.current === 'wire' ? 'crosshair' : 'default';
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Initial snapshot
    takeSnapshot();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.dispose();
      el.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tool changes → canvas mode ────────────────────────────
  useEffect(() =>
    useDesignerStore.subscribe((s) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const t = s.tool;
      if (t !== 'wire') cancelWireDraw();
      canvas.selection = t === 'select';
      canvas.defaultCursor = t === 'wire' ? 'crosshair' : t === 'pan' ? 'grab' : 'default';
      canvas.hoverCursor   = t === 'wire' ? 'crosshair' : t === 'pan' ? 'grab' : 'move';
      canvas.getObjects().forEach((o: any) => {
        if (o.isWire || o.isPort) return;
        o.selectable = t === 'select';
      });
    }),
  []);

  // ── Mouse down handler ────────────────────────────────────
  function handleMouseDown(opt: fabric.IEvent<MouseEvent>) {
    if (toolRef.current !== 'wire') return;
    const target = opt.target as any;
    const ws = wireState.current;

    if (target?.isPort) {
      if (!ws.drawing) {
        ws.drawing = true;
        ws.startPort = target;
        initTempWire(target.left, target.top);
      } else {
        if (target !== ws.startPort) {
          finishWire(ws.startPort!, target);
        }
        cancelWireDraw();
      }
    } else {
      cancelWireDraw();
    }
  }

  // ── Temp wire (rubber-band) using Path ────────────────────
  function initTempWire(x: number, y: number) {
    const canvas = fabricRef.current!;
    const path = new fabric.Path(`M ${x} ${y} L ${x} ${y} L ${x} ${y} L ${x} ${y}`, {
      stroke: '#3dd9d6', strokeWidth: 1.5, fill: 'transparent',
      selectable: false, evented: false, strokeDashArray: [5, 4],
    });
    wireState.current.tempWire = path as any;
    canvas.add(path);
  }

  function updateTempWire(startPort: any, x2: number, y2: number) {
    const canvas = fabricRef.current!;
    const tw = wireState.current.tempWire;
    if (!tw) return;
    const x1 = startPort.left, y1 = startPort.top;
    const mx = (x1 + x2) / 2;
    // Orthogonal L-shape: right angle at mid-x
    const d = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
    (tw as any).set({ path: fabric.Path.fromObject({ path: d }, () => {}).path });
    // Simpler: just re-set path string directly
    const newPath = new fabric.Path(d, {
      stroke: '#3dd9d6', strokeWidth: 1.5, fill: 'transparent',
      selectable: false, evented: false, strokeDashArray: [5, 4],
    });
    canvas.remove(tw);
    wireState.current.tempWire = newPath as any;
    canvas.add(newPath);
    canvas.requestRenderAll();
  }

  // ── Cancel wire ───────────────────────────────────────────
  function cancelWireDraw() {
    const canvas = fabricRef.current;
    const ws = wireState.current;
    if (ws.tempWire && canvas) canvas.remove(ws.tempWire);
    if (ws.hoveredPort) {
      ws.hoveredPort.set({ stroke: '#0a0f1a', strokeWidth: 1.5 });
    }
    ws.drawing = false; ws.startPort = null; ws.tempWire = null; ws.hoveredPort = null;
    canvas?.requestRenderAll();
  }

  // ── Finish wire: orthogonal path ──────────────────────────
  function finishWire(startPort: any, endPort: any) {
    const canvas = fabricRef.current!;
    const x1 = startPort.left, y1 = startPort.top;
    const x2 = endPort.left,   y2 = endPort.top;
    const mx = (x1 + x2) / 2;
    const d  = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;

    const wire = new fabric.Path(d, {
      stroke: '#3dd9d6', strokeWidth: 2, fill: 'transparent',
      selectable: true,
      lockMovementX: true, lockMovementY: true,
      lockScalingX: true,  lockScalingY: true,
      lockRotation: true, hasControls: false,
      perPixelTargetFind: true,
    });
    (wire as any).isWire    = true;
    (wire as any).startPort = startPort;
    (wire as any).endPort   = endPort;

    canvas.add(wire);
    canvas.sendToBack(wire);

    addWire({
      startParentId: startPort.parentId || null,
      startPinIndex: startPort.pinIndex || null,
      startIsIO:     startPort.isIO || false,
      startPortId:   startPort.id || null,
      endParentId:   endPort.parentId || null,
      endPinIndex:   endPort.pinIndex || null,
      endIsIO:       endPort.isIO || false,
      endPortId:     endPort.id || null,
    });

    takeSnapshot(); // P3.5
  }

  // ── Update wire paths when port moves ─────────────────────
  function updateWiresForPort(port: any) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((obj: any) => {
      if (!obj.isWire) return;
      if (obj.startPort === port || obj.endPort === port) {
        const sp = obj.startPort, ep = obj.endPort;
        const x1 = sp.left, y1 = sp.top, x2 = ep.left, y2 = ep.top;
        const mx = (x1 + x2) / 2;
        const d = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
        // Rebuild path
        const newPath = new fabric.Path(d, {
          stroke: '#3dd9d6', strokeWidth: 2, fill: 'transparent',
          selectable: true,
          lockMovementX: true, lockMovementY: true,
          lockScalingX: true,  lockScalingY: true,
          lockRotation: true,  hasControls: false,
          perPixelTargetFind: true,
        });
        (newPath as any).isWire    = true;
        (newPath as any).startPort = sp;
        (newPath as any).endPort   = ep;
        canvas.remove(obj);
        canvas.add(newPath);
        canvas.sendToBack(newPath);
      }
    });
  }

  // ── P3.8: Fit-to-view ────────────────────────────────────
  const fitView = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects().filter((o: any) => !o.isWire && !o.isPort);
    if (!objs.length) { canvas.setViewportTransform([1,0,0,1,0,0]); setZoom(100); return; }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objs.forEach((o) => {
      const b = o.getBoundingRect(true);
      minX = Math.min(minX, b.left);
      minY = Math.min(minY, b.top);
      maxX = Math.max(maxX, b.left + b.width);
      maxY = Math.max(maxY, b.top  + b.height);
    });
    const pad = 80;
    const scaleX = (canvas.width!  - pad * 2) / (maxX - minX || 1);
    const scaleY = (canvas.height! - pad * 2) / (maxY - minY || 1);
    const z = Math.min(scaleX, scaleY, 2);
    canvas.setViewportTransform([
      z, 0, 0, z,
      (canvas.width!  - (maxX + minX) * z) / 2,
      (canvas.height! - (maxY + minY) * z) / 2,
    ]);
    setZoom(Math.round(z * 100));
    canvas.requestRenderAll();
  }, [setZoom]);

  const resetView = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1,0,0,1,0,0]);
    setZoom(100);
    canvas.requestRenderAll();
  }, [setZoom]);

  // ── P3.5: Undo / Redo ─────────────────────────────────────
  const undo = useCallback(() => {
    if (histIdx.current <= 0) { toast.warning('Nothing to undo'); return; }
    histIdx.current--;
    const state = JSON.parse(history.current[histIdx.current]);
    _restoreSnapshot(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redo = useCallback(() => {
    if (histIdx.current >= history.current.length - 1) { toast.warning('Nothing to redo'); return; }
    histIdx.current++;
    const state = JSON.parse(history.current[histIdx.current]);
    _restoreSnapshot(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function _restoreSnapshot(state: { canvas: unknown; wires: WireData[] }) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    clearAll();
    setWires(state.wires);

    canvas.loadFromJSON(
      state.canvas,
      () => {
        const portMap: Record<string, any> = {};
        const ioMap: Record<string, any>   = {};
        canvas.getObjects().forEach((obj: any) => {
          if (obj.isWire) { canvas.remove(obj); return; }
          if (obj.isPort) {
            if (obj.isIO) { ioMap[obj.id] = obj; obj.on('moving', () => updateWiresForPort(obj)); }
            else portMap[`${obj.parentId}|${obj.pinIndex}`] = obj;
          }
          if (obj.type === 'group' && !obj.isIO) {
            obj.on('moving', () => {
              canvas.getObjects().filter((p: any) => p.isPort && !p.isIO && p.parentId === obj.id)
                .forEach((p: any) => {
                  p.set({ left: obj.left + p.relX, top: obj.top + p.relY });
                  p.setCoords(); updateWiresForPort(p);
                });
            });
          }
        });
        state.wires.forEach((wd) => {
          const sp = wd.startIsIO ? ioMap[wd.startPortId!] : portMap[`${wd.startParentId}|${wd.startPinIndex}`];
          const ep = wd.endIsIO   ? ioMap[wd.endPortId!]   : portMap[`${wd.endParentId}|${wd.endPinIndex}`];
          if (sp && ep) finishWireNoSnapshot(sp, ep);
        });
        canvas.requestRenderAll();
      },
      (_: unknown, obj: any) => {
        CUSTOM_PROPS.forEach((p) => { const v = (_ as any)?.[p]; if (v !== undefined) obj[p] = v; });
      }
    );
  }

  // finishWire without taking a snapshot (used during restore)
  function finishWireNoSnapshot(startPort: any, endPort: any) {
    const canvas = fabricRef.current!;
    const x1 = startPort.left, y1 = startPort.top;
    const x2 = endPort.left,   y2 = endPort.top;
    const mx = (x1 + x2) / 2;
    const d  = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
    const wire = new fabric.Path(d, {
      stroke: '#3dd9d6', strokeWidth: 2, fill: 'transparent',
      selectable: true, lockMovementX: true, lockMovementY: true,
      lockScalingX: true, lockScalingY: true, lockRotation: true,
      hasControls: false, perPixelTargetFind: true,
    });
    (wire as any).isWire    = true;
    (wire as any).startPort = startPort;
    (wire as any).endPort   = endPort;
    canvas.add(wire);
    canvas.sendToBack(wire);
  }

  // ── Add IC (P3.1: snap coords) ────────────────────────────
  const addIC = useCallback(async (partNumber: string, x: number, y: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // P3.1: snap drop position to grid
    x = snapTo(x); y = snapTo(y);

    let pinMap: Record<string, number> | undefined;
    try { pinMap = (await IcsApi.get(partNumber)).pins_configuration?.pin_map; } catch { /* use local */ }

    const localDef = IC_DB[partNumber];
    const pinCount  = localDef?.pinCount ?? 14;
    const pinsPerSide = Math.ceil(pinCount / 2);
    const height    = pinsPerSide * PIN_SPACING + 20;

    const body = new fabric.Rect({
      width: IC_WIDTH, height,
      fill: '#0f1a2e', stroke: '#3a5270', strokeWidth: 1, rx: 2, ry: 2,
      shadow: new fabric.Shadow({ color: 'rgba(61,217,214,0.07)', offsetX: 0, offsetY: 0, blur: 14 }),
    });
    const label = new fabric.Text(partNumber, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 11, fontWeight: '600', fill: '#3dd9d6',
      left: IC_WIDTH / 2, top: height / 2,
      originX: 'center', originY: 'center', angle: -90,
    });
    const notch = new fabric.Circle({ radius: 3, fill: '#3dd9d6', opacity: 0.6, left: 6, top: 6 });

    const groupId = genId(`ic_${partNumber}`);
    const group = new fabric.Group([body, label, notch], {
      left: x - IC_WIDTH / 2, top: y - height / 2,
      hasControls: false, subTargetCheck: true, padding: 0,
    });
    (group as any).id = groupId;
    (group as any).icType = partNumber;
    canvas.add(group);

    const pins: fabric.Circle[] = [];
    for (let i = 0; i < pinCount; i++) {
      const isLeft = i < pinsPerSide;
      const pinNum = i + 1;
      const lx = isLeft ? -IC_WIDTH / 2 : IC_WIDTH / 2;
      const ly = isLeft
        ? -height / 2 + 20 + i * PIN_SPACING
        : height / 2 - 20 - (i - pinsPerSide) * PIN_SPACING;

      let pinName = `P${pinNum}`, pinColor = '#4a6180';
      if (localDef?.pins[pinNum]) {
        pinName  = localDef.pins[pinNum].name;
        pinColor = PIN_COLORS[localDef.pins[pinNum].dir];
      } else if (pinMap) {
        const found = Object.entries(pinMap).find(([, n]) => n === pinNum);
        if (found) pinName = found[0];
      }

      const pin = new fabric.Circle({
        radius: PIN_R, fill: pinColor, stroke: '#0a0f1a', strokeWidth: 1.5,
        left: x + lx, top: y + ly,
        originX: 'center', originY: 'center',
        hasControls: false, selectable: false, hoverCursor: 'crosshair',
      });
      (pin as any).isPort   = true;
      (pin as any).parentId = groupId;
      (pin as any).pinIndex = pinNum;
      (pin as any).pinName  = pinName;
      (pin as any).icType   = partNumber;
      (pin as any).relX     = lx;
      (pin as any).relY     = ly;
      canvas.add(pin);
      pins.push(pin);
    }

    group.on('moving', () => {
      pins.forEach((p: any) => {
        p.set({ left: group.left! + p.relX, top: group.top! + p.relY });
        p.setCoords();
        updateWiresForPort(p);
      });
    });

    pins.forEach((p) => canvas.bringToFront(p));
    canvas.requestRenderAll();
    addComponent({ id: groupId, type: 'ic', partNumber, label: partNumber, x, y });
    takeSnapshot(); // P3.5
  }, [addComponent, takeSnapshot]);

  // ── Add I/O (P3.1: snap coords) ──────────────────────────
  const addIO = useCallback((type: 'input' | 'output', x: number, y: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // P3.1: snap
    x = snapTo(x); y = snapTo(y);

    const isInput = type === 'input';
    const color   = isInput ? '#4fa3ff' : '#f5a623';
    const portId  = genId(`io_${type}`);
    const defLabel = isInput ? 'IN' : 'OUT';

    const body = new fabric.Rect({
      width: 60, height: 28,
      fill: isInput ? '#0d1929' : '#1a1000',
      stroke: color, strokeWidth: 1, rx: 3, ry: 3,
    });
    const lbl = new fabric.Text(defLabel, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 10, fontWeight: '600', fill: color,
      left: 30, top: 14, originX: 'center', originY: 'center',
    });
    const group = new fabric.Group([body, lbl], {
      left: x - 30, top: y - 14, hasControls: false,
    });
    (group as any).id     = portId;
    (group as any).isPort = true;
    (group as any).isIO   = true;
    (group as any).ioType = type;
    (group as any).label  = defLabel;
    canvas.add(group);
    group.on('moving', () => updateWiresForPort(group));
    canvas.requestRenderAll();
    addComponent({ id: portId, type, label: defLabel, x, y });
    takeSnapshot(); // P3.5
  }, [addComponent, takeSnapshot]);

  // ── Delete selected ───────────────────────────────────────
  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    const toDelete = (active as any).type === 'activeSelection'
      ? (active as any).getObjects() as any[]
      : [active as any];

    toDelete.forEach((obj: any) => {
      if (obj.isWire) { canvas.remove(obj); return; }
      canvas.getObjects().filter((o: any) =>
        o.isWire && (o.startPort === obj || o.endPort === obj ||
          o.startPort?.parentId === obj.id || o.endPort?.parentId === obj.id)
      ).forEach((w) => canvas.remove(w));
      canvas.getObjects().filter((o: any) => o.isPort && o.parentId === obj.id)
        .forEach((p) => canvas.remove(p));
      if (obj.id) { removeComponent(obj.id); removeWiresForComponent(obj.id); }
      canvas.remove(obj);
    });

    canvas.discardActiveObject();
    canvas.requestRenderAll();
    takeSnapshot(); // P3.5
  }, [removeComponent, removeWiresForComponent, takeSnapshot]);

  // ── Serialize for save/export ─────────────────────────────
  const serializeCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return { objects: {}, wires: [] };
    const json = canvas.toJSON(CUSTOM_PROPS as unknown as string[]);
    json.objects = json.objects.filter((o: any) => !o.isWire);
    const wires = useDesignerStore.getState().wires;
    return { objects: json, wires };
  }, []);

  // ── Load from saved data ──────────────────────────────────
  const loadCanvas = useCallback((objects: unknown, wireData: WireData[]) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear(); clearAll(); setWires(wireData);

    canvas.loadFromJSON(
      objects,
      () => {
        const portMap: Record<string, any> = {}, ioMap: Record<string, any> = {};
        canvas.getObjects().forEach((obj: any) => {
          if (obj.isWire) { canvas.remove(obj); return; }
          if (obj.isPort) {
            if (obj.isIO) { ioMap[obj.id] = obj; obj.on('moving', () => updateWiresForPort(obj)); }
            else portMap[`${obj.parentId}|${obj.pinIndex}`] = obj;
          }
          if (obj.type === 'group' && !obj.isIO) {
            obj.on('moving', () => {
              canvas.getObjects().filter((p: any) => p.isPort && !p.isIO && p.parentId === obj.id)
                .forEach((p: any) => {
                  p.set({ left: obj.left + p.relX, top: obj.top + p.relY });
                  p.setCoords(); updateWiresForPort(p);
                });
            });
          }
        });
        wireData.forEach((wd) => {
          const sp = wd.startIsIO ? ioMap[wd.startPortId!] : portMap[`${wd.startParentId}|${wd.startPinIndex}`];
          const ep = wd.endIsIO   ? ioMap[wd.endPortId!]   : portMap[`${wd.endParentId}|${wd.endPinIndex}`];
          if (sp && ep) finishWireNoSnapshot(sp, ep);
        });
        canvas.requestRenderAll();
        setWires(wireData);
        takeSnapshot();
      },
      (_: unknown, obj: any) => {
        CUSTOM_PROPS.forEach((p) => { const v = (_ as any)?.[p]; if (v !== undefined) obj[p] = v; });
      }
    );
  }, [clearAll, setWires, takeSnapshot]);

  return { fabricRef, addIC, addIO, deleteSelected, serializeCanvas, loadCanvas, undo, redo, fitView, resetView };
}
