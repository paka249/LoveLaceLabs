import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from './usePersistedState';

describe('usePersistedState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the default value when nothing is stored', () => {
    const { result } = renderHook(() => usePersistedState('test:key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('persists updates to localStorage and reflects them on next mount', () => {
    const { result, unmount } = renderHook(() => usePersistedState('test:key', 'default'));
    act(() => {
      result.current[1]('updated');
    });
    expect(result.current[0]).toBe('updated');
    expect(window.localStorage.getItem('test:key')).toBe(JSON.stringify('updated'));
    unmount();

    const { result: secondMount } = renderHook(() => usePersistedState('test:key', 'default'));
    expect(secondMount.current[0]).toBe('updated');
  });

  it('falls back to the default value when stored JSON is malformed', () => {
    window.localStorage.setItem('test:key', '{not valid json');
    const { result } = renderHook(() => usePersistedState('test:key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('supports object values', () => {
    const { result } = renderHook(() => usePersistedState('test:obj', { x: 0, y: 0 }));
    act(() => {
      result.current[1]({ x: 5, y: 9 });
    });
    expect(JSON.parse(window.localStorage.getItem('test:obj'))).toEqual({ x: 5, y: 9 });
  });
});
