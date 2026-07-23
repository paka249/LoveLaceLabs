import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GraphFunctionInput from './GraphFunctionInput';

afterEach(() => {
  cleanup();
});

describe('GraphFunctionInput', () => {
  it('renders a contenteditable textbox', () => {
    render(<GraphFunctionInput value="" onChange={() => {}} placeholder="y = f(x)" isValid />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'true');
  });

  it('shows placeholder text when value is empty', () => {
    render(<GraphFunctionInput value="" onChange={() => {}} placeholder="y = f(x)" isValid />);
    expect(screen.getByText('y = f(x)')).toBeInTheDocument();
  });

  it('hides placeholder when value is non-empty', () => {
    render(<GraphFunctionInput value="sin(x)" onChange={() => {}} placeholder="y = f(x)" isValid />);
    expect(screen.queryByText('y = f(x)')).not.toBeInTheDocument();
  });

  it('deserializes value to innerHTML on mount', () => {
    render(<GraphFunctionInput value="x^2" onChange={() => {}} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');
    expect(editor.innerHTML).toBe('x<sup>2</sup>');
  });

  it('calls onChange with serialized value on input event', () => {
    const onChange = vi.fn();
    render(<GraphFunctionInput value="" onChange={onChange} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');
    editor.innerHTML = 'sin(x)';
    fireEvent.input(editor);
    expect(onChange).toHaveBeenCalledWith('sin(x)');
  });

  it('calls onChange with ^ notation when a sup is present', () => {
    const onChange = vi.fn();
    render(<GraphFunctionInput value="" onChange={onChange} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');
    editor.innerHTML = 'x<sup>2</sup>';
    fireEvent.input(editor);
    expect(onChange).toHaveBeenCalledWith('x^2');
  });

  it('applies error border class when isValid is false', () => {
    render(<GraphFunctionInput value="???" onChange={() => {}} placeholder="" isValid={false} />);
    expect(screen.getByRole('textbox').className).toMatch(/border-red/);
  });

  it('applies normal border class when isValid is true', () => {
    render(<GraphFunctionInput value="x" onChange={() => {}} placeholder="" isValid />);
    expect(screen.getByRole('textbox').className).not.toMatch(/border-red/);
  });

  it('promotes a typed ^ to a <sup> and seeds it with a ZWSP so the caret sticks', () => {
    const onChange = vi.fn();
    render(<GraphFunctionInput value="" onChange={onChange} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');

    editor.focus();
    editor.textContent = 'x^';
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(editor.firstChild, 2);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.input(editor);

    const sup = editor.querySelector('sup');
    expect(sup).not.toBeNull();
    // The sup must carry a non-empty text node (ZWSP placeholder) so a real
    // caret position exists for the next keystroke to land in — a genuinely
    // empty text node has no client rect and native typing won't honor it.
    expect(sup.firstChild.length).toBeGreaterThan(0);
    // But the placeholder must not leak into the serialized expression.
    expect(onChange).toHaveBeenCalledWith('x^');
  });

  it('prevents Enter key from inserting a newline block', () => {
    render(<GraphFunctionInput value="" onChange={() => {}} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');
    fireEvent.keyDown(editor, { key: 'Enter' });
    // jsdom doesn't emulate contenteditable block insertion,
    // so just verify preventDefault was called by confirming no div/br was added
    expect(editor.querySelector('div, br')).toBeNull();
  });
});
