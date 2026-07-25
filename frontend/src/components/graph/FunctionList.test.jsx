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

  describe('function queries like "y(1)"', () => {
    it('shows the computed value inline once another row defines "y"', () => {
      const fns = [
        { ...createFunction(0), expression: 'y = x' },
        { ...createFunction(1), expression: 'y(1)' },
      ];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      expect(screen.getByText('= 1')).toBeInTheDocument();
    });

    it('shows no error border for a query that resolves', () => {
      const fns = [
        { ...createFunction(0), expression: 'y = x' },
        { ...createFunction(1), expression: 'y(1)' },
      ];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      const editors = screen.getAllByRole('textbox');
      expect(editors[1].className).not.toMatch(/border-red/);
    });

    it('updates the shown value as the defining row changes', () => {
      const fns = [
        { ...createFunction(0), expression: 'y = x^2' },
        { ...createFunction(1), expression: 'y(3)' },
      ];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      expect(screen.getByText('= 9')).toBeInTheDocument();
    });

    it('resolves a query regardless of whether the defining row comes before or after it', () => {
      const fns = [
        { ...createFunction(0), expression: 'y(1)' },
        { ...createFunction(1), expression: 'y = x' },
      ];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      expect(screen.getByText('= 1')).toBeInTheDocument();
    });

    it('works with a named function too, e.g. "f(x) = x^2 + 1" then "f(3)"', () => {
      const fns = [
        { ...createFunction(0), expression: 'f(x) = x^2 + 1' },
        { ...createFunction(1), expression: 'f(3)' },
      ];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      expect(screen.getByText('= 10')).toBeInTheDocument();
    });

    it('shows an error border for a query with no matching definition', () => {
      const fns = [{ ...createFunction(0), expression: 'y(1)' }];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      expect(screen.getByRole('textbox').className).toMatch(/border-red/);
      expect(screen.queryByText(/^=/)).not.toBeInTheDocument();
    });

    it('does not show an inline value for a plain (unnamed) curve', () => {
      const fns = [{ ...createFunction(0), expression: 'sin(x)' }];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      expect(screen.queryByText(/^=/)).not.toBeInTheDocument();
    });
  });

  describe('per-row "evaluate at a point" panel', () => {
    it('is closed by default', () => {
      const fns = [{ ...createFunction(0), expression: 'x^2' }];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      expect(screen.queryByLabelText(`x value for function ${fns[0].id}`)).not.toBeInTheDocument();
    });

    it('opens when its toggle is clicked and shows the computed value', () => {
      const fns = [{ ...createFunction(0), expression: 'x^2' }];
      render(<FunctionList functions={fns} onChange={() => {}} />);

      fireEvent.click(screen.getByLabelText(`Evaluate function ${fns[0].id} at a point`));
      const xInput = screen.getByLabelText(`x value for function ${fns[0].id}`);
      fireEvent.change(xInput, { target: { value: '3' } });

      expect(screen.getByText('y = 9')).toBeInTheDocument();
    });

    it('closes again when the toggle is clicked a second time', () => {
      const fns = [{ ...createFunction(0), expression: 'x^2' }];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      const toggle = screen.getByLabelText(`Evaluate function ${fns[0].id} at a point`);

      fireEvent.click(toggle);
      expect(screen.getByLabelText(`x value for function ${fns[0].id}`)).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(screen.queryByLabelText(`x value for function ${fns[0].id}`)).not.toBeInTheDocument();
    });

    it('disambiguates two rows that both define "y" — each panel evaluates its own row, not whichever "y" wins the name lookup', () => {
      const fns = [
        { ...createFunction(0), expression: 'y = x^2' },
        { ...createFunction(1), expression: 'y = x + 100' },
      ];
      render(<FunctionList functions={fns} onChange={() => {}} />);

      fireEvent.click(screen.getByLabelText(`Evaluate function ${fns[0].id} at a point`));
      fireEvent.click(screen.getByLabelText(`Evaluate function ${fns[1].id} at a point`));

      fireEvent.change(screen.getByLabelText(`x value for function ${fns[0].id}`), { target: { value: '3' } });
      fireEvent.change(screen.getByLabelText(`x value for function ${fns[1].id}`), { target: { value: '3' } });

      // Row 0 ("y = x^2") must show 9, not 103 (the *other* row's "y").
      expect(screen.getByText('y = 9')).toBeInTheDocument();
      expect(screen.getByText('y = 103')).toBeInTheDocument();
    });

    it('shows an error message for an unparseable x input instead of a stale/wrong value', () => {
      const fns = [{ ...createFunction(0), expression: 'x^2' }];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      fireEvent.click(screen.getByLabelText(`Evaluate function ${fns[0].id} at a point`));
      fireEvent.change(screen.getByLabelText(`x value for function ${fns[0].id}`), { target: { value: '+*' } });
      expect(screen.queryByText(/^y =/)).not.toBeInTheDocument();
    });

    it('shows an undefined message for an x outside a restricted domain', () => {
      const fns = [{ ...createFunction(0), expression: 'x^2, 1<x<5' }];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      fireEvent.click(screen.getByLabelText(`Evaluate function ${fns[0].id} at a point`));
      fireEvent.change(screen.getByLabelText(`x value for function ${fns[0].id}`), { target: { value: '10' } });
      expect(screen.getByText('Undefined at x = 10.')).toBeInTheDocument();
    });

    it('shows a neutral placeholder before any x has been entered', () => {
      const fns = [{ ...createFunction(0), expression: 'x^2' }];
      render(<FunctionList functions={fns} onChange={() => {}} />);
      fireEvent.click(screen.getByLabelText(`Evaluate function ${fns[0].id} at a point`));
      expect(screen.getByText('y = ?')).toBeInTheDocument();
    });
  });
});
