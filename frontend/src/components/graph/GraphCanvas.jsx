import { useEffect, useRef } from 'react';
import { compileExpression } from '../../utils/graphEvaluator';

const BASE_RANGE = 10;
const GRID_COLOR = 'rgba(133, 148, 139, 0.15)';
const AXIS_COLOR = 'rgba(133, 148, 139, 0.6)';
const LABEL_COLOR = '#bbcac0';

function getViewport(width, height) {
  if (width >= height) {
    const xRange = BASE_RANGE * (width / height);
    return { xMin: -xRange, xMax: xRange, yMin: -BASE_RANGE, yMax: BASE_RANGE };
  }
  const yRange = BASE_RANGE * (height / width);
  return { xMin: -BASE_RANGE, xMax: BASE_RANGE, yMin: -yRange, yMax: yRange };
}

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

      const vp = getViewport(width, height);

      function toPixel(x, y) {
        const px = ((x - vp.xMin) / (vp.xMax - vp.xMin)) * width;
        const py = (1 - (y - vp.yMin) / (vp.yMax - vp.yMin)) * height;
        return [px, py];
      }

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let gx = Math.ceil(vp.xMin); gx <= vp.xMax; gx += 1) {
        const [px] = toPixel(gx, 0);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      }
      for (let gy = Math.ceil(vp.yMin); gy <= vp.yMax; gy += 1) {
        const [, py] = toPixel(0, gy);
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

      ctx.fillStyle = LABEL_COLOR;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let gx = Math.ceil(vp.xMin); gx <= vp.xMax; gx += 1) {
        if (gx === 0) continue;
        const [px] = toPixel(gx, 0);
        ctx.fillText(String(gx), px, originY + 4);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let gy = Math.ceil(vp.yMin); gy <= vp.yMax; gy += 1) {
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
  }, [functions]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-surface-container-low">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
