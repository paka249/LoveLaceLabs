import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { clampPosition, useDraggable } from './useDraggable';

describe('clampPosition', () => {
  it('keeps a position that already fits within bounds', () => {
    const result = clampPosition({ x: 50, y: 50 }, { width: 40, height: 40 }, { width: 200, height: 200 });
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it('clamps negative coordinates to zero', () => {
    const result = clampPosition({ x: -20, y: -5 }, { width: 40, height: 40 }, { width: 200, height: 200 });
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('clamps coordinates that would push the element past the viewport edge', () => {
    const result = clampPosition({ x: 190, y: 190 }, { width: 40, height: 40 }, { width: 200, height: 200 });
    expect(result).toEqual({ x: 160, y: 160 });
  });
});

describe('useDraggable', () => {
  const size = { width: 40, height: 40 };
  const viewport = { width: 300, height: 300 };

  beforeEachViewport(viewport);

  it('starts at the clamped initial position', () => {
    const { result } = renderHook(() =>
      useDraggable({ initialPosition: { x: 10, y: 10 }, size })
    );
    expect(result.current.position).toEqual({ x: 10, y: 10 });
  });

  it('updates position while dragging and calls onDragEnd with the final clamped position on release', () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({ initialPosition: { x: 10, y: 10 }, size, onDragEnd })
    );

    act(() => {
      result.current.handlePointerDown({ clientX: 10, clientY: 10, preventDefault: () => {} });
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      window.dispatchEvent(new window.PointerEvent('pointermove', { clientX: 60, clientY: 45 }));
    });
    expect(result.current.position).toEqual({ x: 60, y: 45 });
    expect(result.current.hasMovedRef.current).toBe(true);

    act(() => {
      window.dispatchEvent(new window.PointerEvent('pointerup'));
    });
    expect(result.current.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 60, y: 45 });
  });

  it('does not mark a move as a drag when no pointermove fired before pointerup', () => {
    const { result } = renderHook(() =>
      useDraggable({ initialPosition: { x: 10, y: 10 }, size })
    );
    act(() => {
      result.current.handlePointerDown({ clientX: 10, clientY: 10, preventDefault: () => {} });
    });
    act(() => {
      window.dispatchEvent(new window.PointerEvent('pointerup'));
    });
    expect(result.current.hasMovedRef.current).toBe(false);
  });

  it('re-clamps the current position when size grows past the viewport edge', () => {
    const { result, rerender } = renderHook(
      ({ size }) => useDraggable({ initialPosition: { x: 270, y: 270 }, size }),
      { initialProps: { size: { width: 20, height: 20 } } }
    );
    expect(result.current.position).toEqual({ x: 270, y: 270 });

    rerender({ size: { width: 60, height: 60 } });
    expect(result.current.position).toEqual({ x: 240, y: 240 });
  });
});

function beforeEachViewport({ width, height }) {
  window.innerWidth = width;
  window.innerHeight = height;
}
