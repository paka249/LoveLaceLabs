import { useEffect, useRef, useState } from 'react';
import { compileExpression } from '../../utils/graphEvaluator';
import {
  DEFAULT_RANGE,
  getViewport,
  gridStepForViewport,
  formatGridLabel,
  formatCoordinate,
  zoomViewport,
  panViewport,
  findNearestCurvePoint,
} from './graphViewport';

const GRID_COLOR = 'rgba(133, 148, 139, 0.15)';
const AXIS_COLOR = 'rgba(133, 148, 139, 0.6)';
const LABEL_COLOR = '#bbcac0';
const POINT_LABEL_BG = 'rgba(5, 20, 36, 0.92)';
// Target spacing between grid lines, in screen pixels — generous enough that
// axis labels (11px monospace) don't crowd each other at any zoom level.
const TARGET_GRID_PX = 80;
const LABEL_MARGIN = 4;
const LABEL_ROW_HEIGHT = 14;
const LABEL_MAX_WIDTH = 60;
const POINT_RADIUS = 4;
// How close (in screen px) a click needs to land to a curve to select it.
const HIT_TOLERANCE_PX = 12;
// A pointer down→up with less movement than this counts as a click (select a
// point) rather than a drag (pan) — real pointers wobble a pixel or two even
// on an intentional click.
const CLICK_MOVE_THRESHOLD_PX = 4;

export default function GraphCanvas({ functions }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [view, setView] = useState({ centerX: 0, centerY: 0, range: DEFAULT_RANGE });
  const [selectedPoint, setSelectedPoint] = useState(null);
  // The pan/zoom/click listeners below are attached once (stable deps) and
  // read these refs instead of `view`/`functions` directly, so they always
  // see fresh values without needing to re-attach on every render.
  const viewRef = useRef(view);
  viewRef.current = view;
  const functionsRef = useRef(functions);
  functionsRef.current = functions;

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

      if (selectedPoint) {
        const fn = functions.find((f) => f.id === selectedPoint.functionId);
        if (fn && fn.visible !== false && fn.expression.trim()) {
          try {
            const evaluate = compileExpression(fn.expression);
            const y = evaluate(selectedPoint.x);
            if (Number.isFinite(y)) {
              const [px, py] = toPixel(selectedPoint.x, y);

              ctx.beginPath();
              ctx.arc(px, py, POINT_RADIUS, 0, Math.PI * 2);
              ctx.fillStyle = fn.color;
              ctx.fill();
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = '#051424';
              ctx.stroke();

              const label = `(${formatCoordinate(selectedPoint.x)}, ${formatCoordinate(y)})`;
              ctx.font = '11px "JetBrains Mono", monospace';
              const pad = 5;
              const boxW = ctx.measureText(label).width + pad * 2;
              const boxH = 18;
              const boxX = Math.min(Math.max(px + 10, LABEL_MARGIN), width - boxW - LABEL_MARGIN);
              const boxY = Math.min(Math.max(py - boxH - 8, LABEL_MARGIN), height - boxH - LABEL_MARGIN);

              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxW, boxH, 4);
              ctx.fillStyle = POINT_LABEL_BG;
              ctx.fill();
              ctx.strokeStyle = fn.color;
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.fillStyle = LABEL_COLOR;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, boxX + pad, boxY + boxH / 2 + 1);
            }
          } catch {
            // The selected function became invalid since selection; just skip the marker.
          }
        }
      }
    }

    draw();

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [functions, view, selectedPoint]);

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

    // Hold-and-drag to pan, click (no/tiny movement) to select a point on a
    // curve. Pointer Events (rather than separate mouse/touch listeners)
    // cover mouse, touch, and pen in one path, and pointer capture keeps the
    // drag going even if the cursor leaves the canvas mid-gesture.
    // (setPointerCapture/hasPointerCapture are optional-chained: every real
    // browser has them, but jsdom's test environment doesn't.)
    const drag = { active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 };

    function handlePointerDown(e) {
      if (e.button !== 0) return;
      drag.active = true;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
      canvas.style.cursor = 'grabbing';
    }

    function handlePointerMove(e) {
      if (!drag.active) return;
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      setView((current) =>
        panViewport(current, { dx, dy, width: container.clientWidth, height: container.clientHeight })
      );
    }

    function endDrag(e) {
      if (!drag.active) return;
      drag.active = false;
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = 'grab';
    }

    function handlePointerUp(e) {
      const totalMove = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      const wasDragging = drag.active;
      endDrag(e);
      if (!wasDragging || totalMove > CLICK_MOVE_THRESHOLD_PX) return;

      const result = findNearestCurvePoint(
        functionsRef.current,
        viewRef.current,
        container.clientWidth,
        container.clientHeight,
        e.offsetX,
        e.offsetY,
        HIT_TOLERANCE_PX
      );
      setSelectedPoint(result);
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', endDrag);
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-surface-container-low">
      <canvas ref={canvasRef} className="block cursor-grab" />
    </div>
  );
}
