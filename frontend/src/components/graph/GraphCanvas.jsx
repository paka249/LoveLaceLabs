import { useEffect, useRef, useState } from 'react';
import { compileExpression } from '../../utils/graphEvaluator';
import { DEFAULT_RANGE, getViewport, gridStepForViewport, formatGridLabel, zoomViewport } from './graphViewport';

const GRID_COLOR = 'rgba(133, 148, 139, 0.15)';
const AXIS_COLOR = 'rgba(133, 148, 139, 0.6)';
const LABEL_COLOR = '#bbcac0';
// Target spacing between grid lines, in screen pixels — generous enough that
// axis labels (11px monospace) don't crowd each other at any zoom level.
const TARGET_GRID_PX = 80;
const LABEL_MARGIN = 4;
const LABEL_ROW_HEIGHT = 14;
const LABEL_MAX_WIDTH = 60;

export default function GraphCanvas({ functions }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [view, setView] = useState({ centerX: 0, centerY: 0, range: DEFAULT_RANGE });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const vp = getViewport(width, height, view);
      const step = gridStepForViewport(width, height, view, TARGET_GRID_PX);
      const xStartIdx = Math.ceil(vp.xMin / step);
      const xEndIdx = Math.floor(vp.xMax / step);
      const yStartIdx = Math.ceil(vp.yMin / step);
      const yEndIdx = Math.floor(vp.yMax / step);

      function toPixel(x, y) {
        const px = ((x - vp.xMin) / (vp.xMax - vp.xMin)) * width;
        const py = (1 - (y - vp.yMin) / (vp.yMax - vp.yMin)) * height;
        return [px, py];
      }

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let i = xStartIdx; i <= xEndIdx; i += 1) {
        const [px] = toPixel(i * step, 0);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      }
      for (let i = yStartIdx; i <= yEndIdx; i += 1) {
        const [, py] = toPixel(0, i * step);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }

      ctx.strokeStyle = AXIS_COLOR;
      ctx.lineWidth = 1.5;
      const [originX, originY] = toPixel(0, 0);
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();

      // Zooming toward a point away from the origin can push the axis itself
      // off-screen. Pin the label row/column to just inside the canvas edge
      // in that case (Desmos does the same) rather than letting every label
      // scroll away with it.
      const labelRowY = Math.min(Math.max(originY + 4, LABEL_MARGIN), height - LABEL_ROW_HEIGHT);
      const labelColX = Math.min(Math.max(originX + 4, LABEL_MARGIN), width - LABEL_MAX_WIDTH);

      ctx.fillStyle = LABEL_COLOR;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = xStartIdx; i <= xEndIdx; i += 1) {
        if (i === 0) continue;
        const gx = i * step;
        const [px] = toPixel(gx, 0);
        ctx.fillText(formatGridLabel(gx, step), px, labelRowY);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let i = yStartIdx; i <= yEndIdx; i += 1) {
        if (i === 0) continue;
        const gy = i * step;
        const [, py] = toPixel(0, gy);
        ctx.fillText(formatGridLabel(gy, step), labelColX, py);
      }

      functions.forEach((fn) => {
        if (fn.visible === false) return;
        if (!fn.expression.trim()) return;
        let evaluate;
        try {
          evaluate = compileExpression(fn.expression);
        } catch {
          return;
        }

        ctx.strokeStyle = fn.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let penDown = false;
        for (let px = 0; px <= width; px += 1) {
          const x = vp.xMin + (px / width) * (vp.xMax - vp.xMin);
          const y = evaluate(x);
          if (!Number.isFinite(y) || y < vp.yMin - 1 || y > vp.yMax + 1) {
            penDown = false;
            continue;
          }
          const [cx, cy] = toPixel(x, y);
          if (!penDown) {
            ctx.moveTo(cx, cy);
            penDown = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        }
        ctx.stroke();
      });
    }

    draw();

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [functions, view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    function handleWheel(e) {
      e.preventDefault();
      setView((current) =>
        zoomViewport(current, {
          deltaY: e.deltaY,
          offsetX: e.offsetX,
          offsetY: e.offsetY,
          width: container.clientWidth,
          height: container.clientHeight,
        })
      );
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-surface-container-low">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
