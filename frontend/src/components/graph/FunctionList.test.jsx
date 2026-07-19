import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import FunctionList, { createFunction } from './FunctionList';

describe('FunctionList', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders one input per function', () => {
    const functions = [createFunction(0), createFunction(1)];
    render(<FunctionList functions={functions} onChange={vi.fn()} />);
    expect(screen.getAllByPlaceholderText('y = f(x)')).toHaveLength(2);
  });

  it('adds a new function with a different palette color when "Add function" is clicked', () => {
    const functions = [createFunction(0)];
    const onChange = vi.fn();
    render(<FunctionList functions={functions} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add function'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(2);
    expect(next[1].color).not.toBe(next[0].color);
  });

  it('updates a function expression on input change', () => {
    const functions = [createFunction(0)];
    const onChange = vi.fn();
    render(<FunctionList functions={functions} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('y = f(x)'), { target: { value: 'x^2' } });
    expect(onChange).toHaveBeenCalledWith([{ ...functions[0], expression: 'x^2' }]);
  });

  it('removes a function when its remove button is clicked', () => {
    const functions = [createFunction(0), createFunction(1)];
    const onChange = vi.fn();
    render(<FunctionList functions={functions} onChange={onChange} />);
    fireEvent.click(screen.getAllByTitle('Remove function')[0]);
    expect(onChange).toHaveBeenCalledWith([functions[1]]);
  });

  it('shows an error border for an unparseable expression', () => {
    const functions = [{ ...createFunction(0), expression: 'x +* 2' }];
    render(<FunctionList functions={functions} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('y = f(x)').className).toMatch(/border-red-400/);
  });

  it('does not show an error border for an empty expression', () => {
    const functions = [createFunction(0)];
    render(<FunctionList functions={functions} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('y = f(x)').className).not.toMatch(/border-red-400/);
  });
});
