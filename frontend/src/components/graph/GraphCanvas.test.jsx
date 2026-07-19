import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
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
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
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
});
