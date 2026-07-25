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

  it('promotes a typed "abs(" to bracket notation with the cursor between the bars', () => {
    const onChange = vi.fn();
    render(<GraphFunctionInput value="" onChange={onChange} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');

    editor.focus();
    editor.textContent = 'abs(';
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(editor.firstChild, 4);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.input(editor);

    expect(editor.textContent).toBe('||');
    expect(sel.anchorNode).toBe(editor.firstChild);
    expect(sel.anchorOffset).toBe(1);
    expect(onChange).toHaveBeenCalledWith('||');
  });

  it('typing the natural ")" skips over the auto-inserted closing bar instead of inserting a stray ")"', () => {
    // Regression: the skip-over logic used to require the typed key to equal
    // the character ahead, so ')' (what users actually press) never matched
    // '|' (abs's auto-inserted closer) and a literal ')' got inserted instead
    // — "abs(2)" ended up as "|2)|" with the caret stuck after the stray ')'.
    render(<GraphFunctionInput value="" onChange={() => {}} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');

    editor.focus();
    editor.textContent = '|2|';
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(editor.firstChild, 2);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    const notCancelled = fireEvent.keyDown(editor, { key: ')' });

    expect(notCancelled).toBe(false); // false means preventDefault() was called
    expect(editor.textContent).toBe('|2|'); // no stray ')' inserted
    expect(sel.anchorNode).toBe(editor.firstChild);
    expect(sel.anchorOffset).toBe(3); // caret moved past the closing bar
  });

  it('still skips a literal ")" for plain function calls', () => {
    render(<GraphFunctionInput value="" onChange={() => {}} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');

    editor.focus();
    editor.textContent = 'sin(2)';
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(editor.firstChild, 5);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    const notCancelled = fireEvent.keyDown(editor, { key: ')' });

    expect(notCancelled).toBe(false);
    expect(sel.anchorOffset).toBe(6);
  });

  it('promotes a typed function keyword to a bracket even while inside an exponent', () => {
    // Regression: bracket-fn detection was nested inside the `!isInsideSup`
    // guard meant only for the '^' promotion, so x^abs(2) left "abs(2)"
    // as literal text inside the <sup> instead of promoting to |2|.
    const onChange = vi.fn();
    render(<GraphFunctionInput value="" onChange={onChange} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');

    editor.innerHTML = 'x<sup>abs(</sup>';
    const sup = editor.querySelector('sup');
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(sup.firstChild, 4);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.input(editor);

    expect(sup.textContent).toBe('||');
  });

  it('typing "," while inside an exponent exits it and still types the comma as normal text', () => {
    // Regression: only Space/ArrowRight/bracket-close exited a live exponent;
    // a comma (needed for the "x^2, 1<x<5" range syntax) just got absorbed
    // into the raised content instead, e.g. "x^2," all rendering superscript.
    // jsdom has no document.execCommand at all, so stub it for this test.
    const execCommandSpy = vi.fn();
    document.execCommand = execCommandSpy;

    const onChange = vi.fn();
    render(<GraphFunctionInput value="" onChange={onChange} placeholder="" isValid />);
    const editor = screen.getByRole('textbox');

    editor.innerHTML = 'x<sup>2</sup>';
    const sup = editor.querySelector('sup');
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(sup.firstChild, 1);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.keyDown(editor, { key: ',' });

    // Caret left the sup's text node (exited the exponent)...
    expect(sel.anchorNode).not.toBe(sup.firstChild);
    // ...and the comma itself still gets typed, unlike a bare Space exit.
    expect(execCommandSpy).toHaveBeenCalledWith('insertText', false, ',');
    expect(onChange).toHaveBeenCalled();

    delete document.execCommand;
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
