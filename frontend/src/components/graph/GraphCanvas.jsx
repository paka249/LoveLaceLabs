import { useEffect, useRef } from 'react';
import { compileExpression } from '../../utils/graphEvaluator';

const VIEWPORT = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const GRID_COLOR = 'rgba(133, 148, 139, 0.15)';
const AXIS_COLOR = 'rgba(133, 148, 139, 0.6)';
const LABEL_COLOR = '#bbcac0';

export default function GraphCanvas({ functions }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

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

      const size = Math.min(width, height);
      const offsetX = (width - size) / 2;
      const offsetY = (height - size) / 2;

      function toPixel(x, y) {
        const px = offsetX + ((x - VIEWPORT.xMin) / (VIEWPORT.xMax - VIEWPORT.xMin)) * size;
        const py = offsetY + (1 - (y - VIEWPORT.yMin) / (VIEWPORT.yMax - VIEWPORT.yMin)) * size;
        return [px, py];
      }

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let gx = Math.ceil(VIEWPORT.xMin); gx <= VIEWPORT.xMax; gx += 1) {
        const [px] = toPixel(gx, 0);
        ctx.beginPath();
        ctx.moveTo(px, offsetY);
        ctx.lineTo(px, offsetY + size);
        ctx.stroke();
      }
      for (let gy = Math.ceil(VIEWPORT.yMin); gy <= VIEWPORT.yMax; gy += 1) {
        const [, py] = toPixel(0, gy);
        ctx.beginPath();
        ctx.moveTo(offsetX, py);
        ctx.lineTo(offsetX + size, py);
        ctx.stroke();
      }

      ctx.strokeStyle = AXIS_COLOR;
      ctx.lineWidth = 1.5;
      const [originX, originY] = toPixel(0, 0);
      ctx.beginPath();
      ctx.moveTo(offsetX, originY);
      ctx.lineTo(offsetX + size, originY);
      ctx.moveTo(originX, offsetY);
      ctx.lineTo(originX, offsetY + size);
      ctx.stroke();

      ctx.fillStyle = LABEL_COLOR;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let gx = Math.ceil(VIEWPORT.xMin); gx <= VIEWPORT.xMax; gx += 1) {
        if (gx === 0) continue;
        const [px] = toPixel(gx, 0);
        ctx.fillText(String(gx), px, originY + 4);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let gy = Math.ceil(VIEWPORT.yMin); gy <= VIEWPORT.yMax; gy += 1) {
        if (gy === 0) continue;
        const [, py] = toPixel(0, gy);
        ctx.fillText(String(gy), originX + 4, py);
      }

      functions.forEach((fn) => {
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
        for (let px = 0; px <= size; px += 1) {
          const x = VIEWPORT.xMin + (px / size) * (VIEWPORT.xMax - VIEWPORT.xMin);
          const y = evaluate(x);
          if (!Number.isFinite(y) || y < VIEWPORT.yMin - 1 || y > VIEWPORT.yMax + 1) {
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
  }, [functions]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-surface-container-low">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
