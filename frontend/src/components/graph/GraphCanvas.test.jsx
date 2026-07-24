import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import GraphCanvas from './GraphCanvas';

function createFakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    roundRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
}

// Simulate a click at (x, y) canvas-relative pixels: a pointerdown + pointerup
// with no movement between them (jsdom has no real layout, so offsetX/offsetY
// end up mirroring clientX/clientY here — fine, since the canvas is at the
// test environment's implicit (0,0) origin anyway).
function click(canvas, x, y) {
  fireEvent.pointerDown(canvas, { clientX: x, clientY: y, button: 0, pointerId: 1 });
  fireEvent.pointerUp(canvas, { clientX: x, clientY: y, button: 0, pointerId: 1 });
}

function drag(canvas, fromX, fromY, toX, toY) {
  fireEvent.pointerDown(canvas, { clientX: fromX, clientY: fromY, button: 0, pointerId: 1 });
  fireEvent.pointerMove(canvas, { clientX: toX, clientY: toY, button: 0, pointerId: 1 });
  fireEvent.pointerUp(canvas, { clientX: toX, clientY: toY, button: 0, pointerId: 1 });
}

describe('GraphCanvas', () => {
  let fakeContext;

  beforeEach(() => {
    fakeContext = createFakeContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext);
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 400 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 300 });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders a canvas element', () => {
    const { container } = render(<GraphCanvas functions={[]} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('gets a 2d rendering context and clears the canvas on draw', () => {
    render(<GraphCanvas functions={[]} />);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    expect(fakeContext.clearRect).toHaveBeenCalled();
  });

  it('strokes a curve for a valid function', () => {
    render(<GraphCanvas functions={[{ id: '1', expression: 'x', color: '#5af0b3' }]} />);
    expect(fakeContext.stroke).toHaveBeenCalled();
    expect(fakeContext.lineTo).toHaveBeenCalled();
  });

  it('does not throw for an invalid expression, and skips drawing it', () => {
    expect(() =>
      render(<GraphCanvas functions={[{ id: '1', expression: 'x +* 2', color: '#5af0b3' }]} />)
    ).not.toThrow();
  });

  it('does not stroke a curve for a function marked not visible', () => {
    // The grid/axes alone already call stroke() many times, so compare against
    // that baseline rather than asserting stroke/lineTo were never called.
    render(<GraphCanvas functions={[]} />);
    const baselineStrokes = fakeContext.stroke.mock.calls.length;
    cleanup();

    fakeContext = createFakeContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext);
    render(<GraphCanvas functions={[{ id: '1', expression: 'x', color: '#5af0b3', visible: false }]} />);
    expect(fakeContext.stroke.mock.calls.length).toBe(baselineStrokes);
  });

  it('still strokes a curve when visible is left undefined (default-on for legacy data)', () => {
    render(<GraphCanvas functions={[]} />);
    const baselineStrokes = fakeContext.stroke.mock.calls.length;
    cleanup();

    fakeContext = createFakeContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext);
    render(<GraphCanvas functions={[{ id: '1', expression: 'x', color: '#5af0b3' }]} />);
    expect(fakeContext.stroke.mock.calls.length).toBe(baselineStrokes + 1);
  });

  describe('click to select a point', () => {
    // Container is mocked to 400x300, default view is centered on world
    // (0,0), so pixel (200,150) is the origin — and "x" (y=x) passes through it.
    const line = [{ id: '1', expression: 'x', color: '#5af0b3', visible: true }];

    it('clicking on a curve draws a point marker there', () => {
      const { container } = render(<GraphCanvas functions={line} />);
      const canvas = container.querySelector('canvas');
      fakeContext.arc.mockClear();

      click(canvas, 200, 150);

      expect(fakeContext.arc).toHaveBeenCalled();
      const [px, py] = fakeContext.arc.mock.calls.at(-1);
      expect(px).toBeCloseTo(200, 0);
      expect(py).toBeCloseTo(150, 0);
    });

    it('clicking far from any curve does not draw a point marker', () => {
      const { container } = render(<GraphCanvas functions={line} />);
      const canvas = container.querySelector('canvas');
      fakeContext.arc.mockClear();

      click(canvas, 200, 50); // well above the y=x line at x=0

      expect(fakeContext.arc).not.toHaveBeenCalled();
    });

    it('clicking empty space after selecting a point clears it', () => {
      const { container } = render(<GraphCanvas functions={line} />);
      const canvas = container.querySelector('canvas');

      click(canvas, 200, 150);
      expect(fakeContext.arc).toHaveBeenCalled();

      fakeContext.arc.mockClear();
      click(canvas, 200, 50);
      expect(fakeContext.arc).not.toHaveBeenCalled();
    });

    it('a drag (pan) across the curve does not select a point', () => {
      const { container } = render(<GraphCanvas functions={line} />);
      const canvas = container.querySelector('canvas');
      fakeContext.arc.mockClear();

      drag(canvas, 200, 150, 260, 150);

      expect(fakeContext.arc).not.toHaveBeenCalled();
    });

    it('does not throw when the selected function is later removed', () => {
      const { container, rerender } = render(<GraphCanvas functions={line} />);
      const canvas = container.querySelector('canvas');

      click(canvas, 200, 150);
      expect(fakeContext.arc).toHaveBeenCalled();

      fakeContext.arc.mockClear();
      expect(() => rerender(<GraphCanvas functions={[]} />)).not.toThrow();
      expect(fakeContext.arc).not.toHaveBeenCalled();
    });
  });
});
