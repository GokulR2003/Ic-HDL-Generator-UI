'use client';
import { useRef, useEffect } from 'react';
import { useCanvas } from '@/hooks/useCanvas';

interface CanvasAreaProps {
  canvasRef: ReturnType<typeof useCanvas>;
}

export function CanvasArea({ canvasRef: canvasHook }: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Once mounted, pass the containerRef to the hook initialiser
  // (the hook does the actual canvas setup)
  useEffect(() => {
    // containerRef is passed in as prop from parent — nothing extra needed here
  }, []);

  return (
    <div
      ref={containerRef}
      className="canvas-grid"
      style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
    />
  );
}
