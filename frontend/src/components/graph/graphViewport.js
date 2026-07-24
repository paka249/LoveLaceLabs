import { compileExpression } from '../../utils/graphEvaluator';

export const DEFAULT_RANGE = 10;
export const MIN_RANGE = 1e-6;
export const MAX_RANGE = 1e9;

// Wheel notches vary wildly in deltaY magnitude across devices: a mouse wheel
// sends ~100-120 per notch, while trackpad two-finger scroll/pinch sends a
// stream of many *small* deltas per gesture. ZOOM_SENSITIVITY is tuned so a
// trackpad gesture still accumulates a noticeable zoom quickly; MAX_WHEEL_DELTA
// just caps the rare oversized single event (e.g. fast momentum-scroll) from
// jumping the view too far in one tick.
const MAX_WHEEL_DELTA = 500;
const ZOOM_SENSITIVITY = 0.005;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// How far the viewport extends from its center on each axis. Kept equal in
// world-units-per-pixel on both axes (a circle stays a circle) by giving the
// longer screen dimension the proportionally larger half-range.
export function halfRanges(width, height, range) {
  if (width >= height) {
    return { xHalf: range * (width / height), yHalf: range };
  }
  return { xHalf: range, yHalf: range * (height / width) };
}

export function getViewport(width, height, view) {
  const { xHalf, yHalf } = halfRanges(width, height, view.range);
  return {
    xMin: view.centerX - xHalf,
    xMax: view.centerX + xHalf,
    yMin: view.centerY - yHalf,
    yMax: view.centerY + yHalf,
  };
}

// Canvas-pixel ↔ world-coordinate conversion, shared by drawing and
// interaction (click hit-testing, zoom-toward-cursor, etc.) so they can never
// disagree about where a point on screen actually is in graph-space.
export function pixelToWorld(width, height, view, px, py) {
  const vp = getViewport(width, height, view);
  return {
    x: vp.xMin + (px / width) * (vp.xMax - vp.xMin),
    y: vp.yMin + (1 - py / height) * (vp.yMax - vp.yMin),
  };
}

export function worldToPixel(width, height, view, x, y) {
  const vp = getViewport(width, height, view);
  return {
    px: ((x - vp.xMin) / (vp.xMax - vp.xMin)) * width,
    py: (1 - (y - vp.yMin) / (vp.yMax - vp.yMin)) * height,
  };
}

// Round a raw "world units per grid line" value up to a human-friendly step:
// 1, 2, or 5 times a power of 10. This is what keeps axis labels from packing
// together when zoomed out (the step grows) or thinning out to nothing when
// zoomed in (the step shrinks) — same idea Desmos/Google Maps use for grids.
const NICE_FRACTIONS = [1, 2, 5, 10];
export function niceGridStep(rawStep) {
  if (!(rawStep > 0) || !Number.isFinite(rawStep)) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const base = 10 ** exponent;
  const fraction = rawStep / base;
  const nice = NICE_FRACTIONS.find((f) => fraction <= f + 1e-9) ?? 10;
  return nice * base;
}

// Pick the grid step for a viewport so grid lines land roughly targetPx apart
// on screen, regardless of zoom level.
export function gridStepForViewport(width, height, view, targetPx) {
  const { xHalf } = halfRanges(width, height, view.range);
  const pixelsPerUnit = width / (2 * xHalf);
  return niceGridStep(targetPx / pixelsPerUnit);
}

// Format a grid coordinate with just enough decimal places for the current
// step (e.g. step=0.05 → 2 decimals), avoiding floating-point noise like
// "0.30000000000000004".
export function formatGridLabel(value, step) {
  const decimals = Math.min(10, Math.max(0, -Math.floor(Math.log10(step))));
  const rounded = Number(value.toFixed(decimals));
  return rounded === 0 ? '0' : String(rounded);
}

// Zoom the viewport by a wheel event's deltaY, keeping the world point under
// the cursor fixed on screen (the standard "zoom toward cursor" behavior).
// offsetX/offsetY are the cursor position in canvas pixels; width/height are
// the canvas's CSS pixel dimensions.
export function zoomViewport(view, { deltaY, offsetX, offsetY, width, height }) {
  const clampedDelta = clamp(deltaY, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA);
  const factor = Math.exp(clampedDelta * ZOOM_SENSITIVITY);
  const newRange = clamp(view.range * factor, MIN_RANGE, MAX_RANGE);

  const { x: worldX, y: worldY } = pixelToWorld(width, height, view, offsetX, offsetY);

  const { xHalf, yHalf } = halfRanges(width, height, newRange);
  const centerX = worldX - (offsetX / width - 0.5) * 2 * xHalf;
  const centerY = worldY - (0.5 - offsetY / height) * 2 * yHalf;

  return { centerX, centerY, range: newRange };
}

// Pan the viewport by a pointer-drag delta (in screen pixels), so the world
// content under the cursor tracks the drag 1:1 — dragging right/down slides
// the graph right/down, like grabbing a piece of paper.
export function panViewport(view, { dx, dy, width, height }) {
  const { xHalf } = halfRanges(width, height, view.range);
  const pixelsPerUnit = width / (2 * xHalf);
  return {
    centerX: view.centerX - dx / pixelsPerUnit,
    centerY: view.centerY + dy / pixelsPerUnit,
    range: view.range,
  };
}

// Format a coordinate for the click-to-inspect point readout. Unlike
// formatGridLabel this isn't step-aware (a single clicked point has no
// associated grid step) — just enough precision to be useful without
// floating-point noise, trimmed of trailing zeros.
export function formatCoordinate(value) {
  if (!Number.isFinite(value)) return '—';
  const normalized = Object.is(value, -0) ? 0 : value;
  return String(Number(normalized.toFixed(4)));
}

// Find the curve nearest a click, for "click a function to see its
// coordinate point". Evaluates every visible function at the clicked x (same
// world-x the draw loop would use for that pixel column) and picks whichever
// curve passes closest to the click in screen space, provided it's within
// tolerancePx — clicking empty space (or too far from any curve) finds none.
export function findNearestCurvePoint(functions, view, width, height, clickPx, clickPy, tolerancePx) {
  const { x: worldX } = pixelToWorld(width, height, view, clickPx, clickPy);

  let best = null;
  for (const fn of functions) {
    if (fn.visible === false || !fn.expression?.trim()) continue;

    let evaluate;
    try {
      evaluate = compileExpression(fn.expression);
    } catch {
      continue;
    }

    const y = evaluate(worldX);
    if (!Number.isFinite(y)) continue;

    const { py } = worldToPixel(width, height, view, worldX, y);
    const dist = Math.abs(py - clickPy);
    if (dist <= tolerancePx && (!best || dist < best.dist)) {
      best = { functionId: fn.id, x: worldX, dist };
    }
  }

  return best ? { functionId: best.functionId, x: best.x } : null;
}
