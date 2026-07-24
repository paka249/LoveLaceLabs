import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RANGE,
  MIN_RANGE,
  MAX_RANGE,
  halfRanges,
  getViewport,
  niceGridStep,
  gridStepForViewport,
  formatGridLabel,
  zoomViewport,
} from './graphViewport';

describe('halfRanges', () => {
  it('gives the wider dimension the larger half-range, keeping world units per pixel equal on both axes', () => {
    const { xHalf, yHalf } = halfRanges(400, 300, 10);
    expect(xHalf).toBeCloseTo(10 * (400 / 300));
    expect(yHalf).toBe(10);
    // Equal px-per-unit on both axes means a circle renders as a circle.
    expect(400 / (2 * xHalf)).toBeCloseTo(300 / (2 * yHalf));
  });

  it('gives the taller dimension the larger half-range for a portrait viewport', () => {
    const { xHalf, yHalf } = halfRanges(300, 400, 10);
    expect(xHalf).toBe(10);
    expect(yHalf).toBeCloseTo(10 * (400 / 300));
  });

  it('is symmetric for a square viewport', () => {
    const { xHalf, yHalf } = halfRanges(300, 300, 10);
    expect(xHalf).toBe(10);
    expect(yHalf).toBe(10);
  });
});

describe('getViewport', () => {
  it('centers the viewport on the given center point', () => {
    const vp = getViewport(400, 300, { centerX: 5, centerY: -3, range: 10 });
    expect(vp.yMin).toBeCloseTo(-13);
    expect(vp.yMax).toBeCloseTo(7);
  });
});

describe('niceGridStep', () => {
  it('rounds up to 1 for a raw step just above 1', () => {
    expect(niceGridStep(1.1)).toBe(2);
  });

  it('rounds up to 2 for a raw step of 2', () => {
    expect(niceGridStep(2)).toBe(2);
  });

  it('rounds up to 5 for a raw step of 3', () => {
    expect(niceGridStep(3)).toBe(5);
  });

  it('rounds up to 10 for a raw step just above 5', () => {
    expect(niceGridStep(6)).toBe(10);
  });

  it('works below 1 (fractional steps for zoomed-in views)', () => {
    expect(niceGridStep(0.03)).toBeCloseTo(0.05);
    expect(niceGridStep(0.007)).toBeCloseTo(0.01);
  });

  it('works above 10 (large steps for zoomed-out views)', () => {
    expect(niceGridStep(340)).toBe(500);
    expect(niceGridStep(45000)).toBe(50000);
  });

  it('falls back to 1 for non-positive or non-finite input', () => {
    expect(niceGridStep(0)).toBe(1);
    expect(niceGridStep(-5)).toBe(1);
    expect(niceGridStep(NaN)).toBe(1);
    expect(niceGridStep(Infinity)).toBe(1);
  });
});

describe('gridStepForViewport', () => {
  it('produces a step that puts grid lines within a sane pixel range of the target spacing', () => {
    const view = { centerX: 0, centerY: 0, range: DEFAULT_RANGE };
    const step = gridStepForViewport(400, 300, view, 80);
    const { xHalf } = halfRanges(400, 300, view.range);
    const pixelsPerUnit = 400 / (2 * xHalf);
    const actualSpacingPx = step * pixelsPerUnit;
    // "Nice" rounding means the actual spacing can be up to 10x the target
    // (e.g. target 80 but raw step rounds 8 → 10) — but never below it,
    // since niceGridStep only ever rounds a raw step up.
    expect(actualSpacingPx).toBeGreaterThanOrEqual(80);
    expect(actualSpacingPx).toBeLessThan(800);
  });

  it('shrinks the step (more grid lines) as range shrinks (zooming in)', () => {
    const zoomedIn = gridStepForViewport(400, 300, { centerX: 0, centerY: 0, range: 0.1 }, 80);
    const zoomedOut = gridStepForViewport(400, 300, { centerX: 0, centerY: 0, range: 1000 }, 80);
    expect(zoomedIn).toBeLessThan(zoomedOut);
  });
});

describe('formatGridLabel', () => {
  it('formats whole numbers with no decimals for an integer step', () => {
    expect(formatGridLabel(5, 1)).toBe('5');
    expect(formatGridLabel(-3, 1)).toBe('-3');
  });

  it('formats with the right precision for a fractional step', () => {
    expect(formatGridLabel(0.3, 0.1)).toBe('0.3');
    expect(formatGridLabel(0.15, 0.05)).toBe('0.15');
  });

  it('does not leak floating-point noise like 0.30000000000000004', () => {
    // 0.1 + 0.2 style FP error, reached via repeated-step arithmetic
    const noisy = 3 * 0.1;
    expect(formatGridLabel(noisy, 0.1)).toBe('0.3');
  });

  it('normalizes negative-zero to "0"', () => {
    expect(formatGridLabel(-0, 1)).toBe('0');
  });

  it('drops decimals for a large integer step', () => {
    expect(formatGridLabel(5000, 1000)).toBe('5000');
  });
});

describe('zoomViewport', () => {
  const base = { centerX: 0, centerY: 0, range: DEFAULT_RANGE };
  const dims = { width: 400, height: 300 };

  it('zooms in (shrinks range) for a negative deltaY (wheel up)', () => {
    const next = zoomViewport(base, { deltaY: -100, offsetX: 200, offsetY: 150, ...dims });
    expect(next.range).toBeLessThan(base.range);
  });

  it('zooms out (grows range) for a positive deltaY (wheel down)', () => {
    const next = zoomViewport(base, { deltaY: 100, offsetX: 200, offsetY: 150, ...dims });
    expect(next.range).toBeGreaterThan(base.range);
  });

  it('keeps the world point under the cursor fixed on screen', () => {
    const offsetX = 300;
    const offsetY = 100;
    const vpBefore = getViewport(dims.width, dims.height, base);
    const worldXBefore = vpBefore.xMin + (offsetX / dims.width) * (vpBefore.xMax - vpBefore.xMin);
    const worldYBefore = vpBefore.yMin + (1 - offsetY / dims.height) * (vpBefore.yMax - vpBefore.yMin);

    const next = zoomViewport(base, { deltaY: -150, offsetX, offsetY, ...dims });
    const vpAfter = getViewport(dims.width, dims.height, next);
    const worldXAfter = vpAfter.xMin + (offsetX / dims.width) * (vpAfter.xMax - vpAfter.xMin);
    const worldYAfter = vpAfter.yMin + (1 - offsetY / dims.height) * (vpAfter.yMax - vpAfter.yMin);

    expect(worldXAfter).toBeCloseTo(worldXBefore, 9);
    expect(worldYAfter).toBeCloseTo(worldYBefore, 9);
  });

  it('zooming toward the center point does not move the center', () => {
    const next = zoomViewport(base, { deltaY: -150, offsetX: 200, offsetY: 150, ...dims });
    expect(next.centerX).toBeCloseTo(0, 9);
    expect(next.centerY).toBeCloseTo(0, 9);
  });

  it('clamps range to MIN_RANGE on extreme zoom-in', () => {
    const deeplyZoomed = { centerX: 0, centerY: 0, range: MIN_RANGE * 1.001 };
    const next = zoomViewport(deeplyZoomed, { deltaY: -100000, offsetX: 200, offsetY: 150, ...dims });
    expect(next.range).toBeGreaterThanOrEqual(MIN_RANGE);
  });

  it('clamps range to MAX_RANGE on extreme zoom-out', () => {
    const zoomedOut = { centerX: 0, centerY: 0, range: MAX_RANGE * 0.999 };
    const next = zoomViewport(zoomedOut, { deltaY: 100000, offsetX: 200, offsetY: 150, ...dims });
    expect(next.range).toBeLessThanOrEqual(MAX_RANGE);
  });

  it('clamps an extreme single deltaY the same as the clamp cap, so one wild trackpad event cannot jump arbitrarily far', () => {
    const huge = zoomViewport(base, { deltaY: 100000, offsetX: 200, offsetY: 150, ...dims });
    const capped = zoomViewport(base, { deltaY: 500, offsetX: 200, offsetY: 150, ...dims });
    expect(huge.range).toBeCloseTo(capped.range, 9);
  });
});
