import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FunctionList, { createFunction } from './FunctionList';

function makeProps(overrides = {}) {
  return {
    functions: [createFunction(0)],
    onChange: vi.fn(),
    ...overrides,
  };
}

describe('FunctionList', () => {
  it('renders one textbox per function', () => {
    const props = makeProps({ functions: [createFunction(0), createFunction(1)] });
    render(<FunctionList {...props} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('adds a new function with a different palette color when "Add function" is clicked', () => {
    const onChange = vi.fn();
    render(<FunctionList functions={[createFunction(0)]} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add function'));
    expect(onChange).toHaveBeenCalledOnce();
    const updated = onChange.mock.calls[0][0];
    expect(updated).toHaveLength(2);
    expect(updated[0].color).not.toBe(updated[1].color);
  });

  it('updates a function expression on input event', () => {
    const onChange = vi.fn();
    const fns = [createFunction(0)];
    render(<FunctionList functions={fns} onChange={onChange} />);
    const editor = screen.getByRole('textbox');
    editor.innerHTML = 'sin(x)';
    fireEvent.input(editor);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0][0].expression).toBe('sin(x)');
  });

  it('removes a function when its remove button is clicked', () => {
    const onChange = vi.fn();
    render(<FunctionList functions={[createFunction(0)]} onChange={onChange} />);
    fireEvent.click(screen.getByTitle('Remove function'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows an error border for an unparseable expression', () => {
    const fns = [{ ...createFunction(0), expression: '???' }];
    render(<FunctionList functions={fns} onChange={() => {}} />);
    expect(screen.getByRole('textbox').className).toMatch(/border-red/);
  });

  it('does not show an error border for an empty expression', () => {
    render(<FunctionList functions={[createFunction(0)]} onChange={() => {}} />);
    expect(screen.getByRole('textbox').className).not.toMatch(/border-red/);
  });

  it('updates function color when color input changes', () => {
    const onChange = vi.fn();
    const fns = [createFunction(0)];
    const { container } = render(<FunctionList functions={fns} onChange={onChange} />);
    const colorInput = container.querySelector('input[type="color"]');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0][0].color).toBe('#ff0000');
  });

  it('creates functions as visible by default', () => {
    expect(createFunction(0).visible).toBe(true);
  });

  it('toggles a function to hidden when its visibility switch is clicked', () => {
    const onChange = vi.fn();
    const fns = [createFunction(0)];
    render(<FunctionList functions={fns} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(`Toggle visibility for function ${fns[0].id}`));
    expect(onChange).toHaveBeenCalledWith([{ ...fns[0], visible: false }]);
  });

  it('toggles a hidden function back to visible when clicked again', () => {
    const onChange = vi.fn();
    const fns = [{ ...createFunction(0), visible: false }];
    render(<FunctionList functions={fns} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(`Toggle visibility for function ${fns[0].id}`));
    expect(onChange).toHaveBeenCalledWith([{ ...fns[0], visible: true }]);
  });

  it('treats a function with no visible field as visible (legacy data)', () => {
    const onChange = vi.fn();
    const fns = [{ id: 'fn-legacy', expression: 'x', color: '#5af0b3' }];
    render(<FunctionList functions={fns} onChange={onChange} />);
    expect(screen.getByLabelText('Toggle visibility for function fn-legacy')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('dims the row for a hidden function', () => {
    const fns = [{ ...createFunction(0), visible: false }];
    render(<FunctionList functions={fns} onChange={() => {}} />);
    expect(screen.getByRole('textbox').closest('div.flex').className).toMatch(/opacity-40/);
  });
});
