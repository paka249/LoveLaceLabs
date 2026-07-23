# Graph Rich Input & Color Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain text input in graph function rows with a live contenteditable editor that renders exponents as true superscripts when you press `^`, and make the color dot open a native color picker.

**Architecture:** A new `GraphFunctionInput` component owns a `contenteditable` div. Pressing `^` inserts a `<sup>` element and moves the cursor inside it; Space or ArrowRight at the end of the sup exits back to the main line. A pure serializer (DOM→string) and deserializer (string→HTML) handle the round-trip between the component's internal DOM and the plain expression string that `compileExpression` already understands. The color dot in `FunctionList` becomes a `<label>` wrapping a `sr-only` `<input type="color">`.

**Tech Stack:** React 19, Tailwind CSS v4, Vitest + Testing Library, native browser Selection/Range API (available in jsdom)

## Global Constraints

- All tests must stay green: `npx vitest run` must exit 0 after every task commit
- No new npm packages — KaTeX and all tooling already installed
- File paths are relative to `frontend/src/`
- Run tests from the `frontend/` directory: `cd frontend && npx vitest run`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `components/graph/graphInputUtils.js` | Pure serialize/deserialize functions |
| Create | `components/graph/graphInputUtils.test.js` | Unit tests for pure functions |
| Create | `components/graph/GraphFunctionInput.jsx` | Contenteditable component |
| Create | `components/graph/GraphFunctionInput.test.jsx` | Component tests |
| Modify | `components/graph/FunctionList.jsx` | Swap `<input>` for `GraphFunctionInput`, add color picker |
| Modify | `components/graph/FunctionList.test.jsx` | Update tests for new UI |

---

### Task 1: Serializer/Deserializer utilities

**Files:**
- Create: `components/graph/graphInputUtils.js`
- Create: `components/graph/graphInputUtils.test.js`

**Interfaces:**
- Produces:
  - `serializeInput(el: HTMLElement): string` — walks childNodes of a contenteditable div; text nodes pass through, `<sup>` nodes become `^{textContent}`
  - `deserializeToHtml(str: string): string` — converts `x^2+1` → `x<sup>2</sup>+1`; HTML-escapes text segments

- [ ] **Step 1: Write the failing tests**

Create `components/graph/graphInputUtils.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { serializeInput, deserializeToHtml } from './graphInputUtils';

function makeEl(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('serializeInput', () => {
  it('returns plain text unchanged', () => {
    expect(serializeInput(makeEl('sin(x)'))).toBe('sin(x)');
  });

  it('converts a <sup> to ^{content}', () => {
    expect(serializeInput(makeEl('x<sup>2</sup>+1'))).toBe('x^2+1');
  });

  it('handles multiple superscripts', () => {
    expect(serializeInput(makeEl('x<sup>2</sup>+y<sup>3</sup>'))).toBe('x^2+y^3');
  });

  it('ignores <br> and other elements', () => {
    expect(serializeInput(makeEl('x<br>+1'))).toBe('x+1');
  });

  it('returns empty string for empty element', () => {
    expect(serializeInput(makeEl(''))).toBe('');
  });
});

describe('deserializeToHtml', () => {
  it('returns empty string for empty input', () => {
    expect(deserializeToHtml('')).toBe('');
  });

  it('returns escaped plain text when no ^ present', () => {
    expect(deserializeToHtml('sin(x)')).toBe('sin(x)');
  });

  it('wraps the exponent in <sup>', () => {
    expect(deserializeToHtml('x^2')).toBe('x<sup>2</sup>');
  });

  it('puts trailing non-exponent text outside the sup', () => {
    expect(deserializeToHtml('x^2+1')).toBe('x<sup>2</sup>+1');
  });

  it('handles parenthesised exponents', () => {
    expect(deserializeToHtml('x^(n+1)')).toBe('x<sup>(n+1)</sup>');
  });

  it('handles multiple carets', () => {
    expect(deserializeToHtml('x^2+y^3')).toBe('x<sup>2</sup>+y<sup>3</sup>');
  });

  it('HTML-escapes dangerous characters in text segments', () => {
    expect(deserializeToHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
  });

  it('round-trips: serialize(deserialize(str)) === str for common expressions', () => {
    const exprs = ['x^2+1', 'sin(x^2)', 'x^(n+1)+y^3', '2x+1'];
    for (const expr of exprs) {
      const el = makeEl(deserializeToHtml(expr));
      expect(serializeInput(el)).toBe(expr);
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd frontend && npx vitest run src/components/graph/graphInputUtils.test.js
```
Expected: all tests FAIL with "Cannot find module"

- [ ] **Step 3: Implement the utilities**

Create `components/graph/graphInputUtils.js`:

```js
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Walk a contenteditable div's childNodes → plain expression string.
// Text nodes pass through; <sup> nodes become ^{textContent}; all others skipped.
export function serializeInput(el) {
  let result = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeName === 'SUP') {
      result += '^' + node.textContent;
    }
  }
  return result;
}

// Convert a plain expression string to innerHTML for a contenteditable div.
// "x^2+1" → "x<sup>2</sup>+1"
// "x^(n+1)" → "x<sup>(n+1)</sup>"
export function deserializeToHtml(str) {
  if (!str) return '';

  const segments = str.split('^');
  let html = escapeHtml(segments[0]);

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    let expEnd;

    if (seg.startsWith('(')) {
      // Take until matching close paren
      let depth = 0;
      expEnd = seg.length;
      for (let j = 0; j < seg.length; j++) {
        if (seg[j] === '(') depth += 1;
        else if (seg[j] === ')') {
          depth -= 1;
          if (depth === 0) { expEnd = j + 1; break; }
        }
      }
    } else {
      // Take until space or arithmetic operator
      const m = seg.search(/[\s+\-*/^%(]/);
      expEnd = m === -1 ? seg.length : m;
    }

    const exp = seg.slice(0, expEnd);
    const rest = seg.slice(expEnd);
    html += `<sup>${escapeHtml(exp)}</sup>${escapeHtml(rest)}`;
  }

  return html;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
cd frontend && npx vitest run src/components/graph/graphInputUtils.test.js
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```
git add frontend/src/components/graph/graphInputUtils.js frontend/src/components/graph/graphInputUtils.test.js
git commit -m "feat(graph): add serialize/deserialize utilities for rich function input"
```

---

### Task 2: `GraphFunctionInput` component

**Files:**
- Create: `components/graph/GraphFunctionInput.jsx`
- Create: `components/graph/GraphFunctionInput.test.jsx`

**Interfaces:**
- Consumes: `serializeInput`, `deserializeToHtml` from `./graphInputUtils`
- Props: `{ value: string, onChange: (string) => void, placeholder: string, isValid: bool }`
- Produces: a `contenteditable` div with `role="textbox"` and `aria-label="Function expression"`

- [ ] **Step 1: Write the failing tests**

Create `components/graph/GraphFunctionInput.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GraphFunctionInput from './GraphFunctionInput';

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
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd frontend && npx vitest run src/components/graph/GraphFunctionInput.test.jsx
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the component**

Create `components/graph/GraphFunctionInput.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import { serializeInput, deserializeToHtml } from './graphInputUtils';

export default function GraphFunctionInput({ value, onChange, placeholder, isValid }) {
  const editorRef = useRef(null);

  // Sync external value changes to DOM without fighting user edits
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const current = serializeInput(el);
    if (current !== value) {
      el.innerHTML = deserializeToHtml(value);
    }
  }, [value]);

  function isInsideSup(node) {
    let cur = node;
    while (cur && cur !== editorRef.current) {
      if (cur.nodeName === 'SUP') return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  function insertSup() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();

    const sup = document.createElement('sup');
    const textNode = document.createTextNode('');
    sup.appendChild(textNode);
    range.insertNode(sup);

    // Ensure there is a text node after the sup to exit into
    if (!sup.nextSibling || sup.nextSibling.nodeType !== Node.TEXT_NODE) {
      sup.after(document.createTextNode(''));
    }

    const newRange = document.createRange();
    newRange.setStart(textNode, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    onChange(serializeInput(editorRef.current));
  }

  function exitSup(supEl) {
    const sel = window.getSelection();
    if (!sel) return;
    let afterNode = supEl.nextSibling;
    if (!afterNode || afterNode.nodeType !== Node.TEXT_NODE) {
      afterNode = document.createTextNode('');
      supEl.after(afterNode);
    }
    const newRange = document.createRange();
    newRange.setStart(afterNode, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  function handleKeyDown(e) {
    if (e.key === '^') {
      e.preventDefault();
      insertSup();
      return;
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const supEl = isInsideSup(sel.anchorNode);

    if (e.key === ' ' && supEl) {
      e.preventDefault();
      exitSup(supEl);
      return;
    }

    if (e.key === 'ArrowRight' && supEl) {
      const offset = sel.anchorOffset;
      const len = sel.anchorNode?.textContent?.length ?? 0;
      if (offset >= len) {
        e.preventDefault();
        exitSup(supEl);
      }
      return;
    }

    if (e.key === 'Backspace' && supEl) {
      if (sel.anchorOffset === 0 && sel.focusOffset === 0) {
        e.preventDefault();
        const parent = supEl.parentNode;
        const caretText = document.createTextNode('^');
        parent.insertBefore(caretText, supEl);
        supEl.remove();
        const newRange = document.createRange();
        newRange.setStart(caretText, 1);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        onChange(serializeInput(editorRef.current));
      }
    }
  }

  function handleInput() {
    onChange(serializeInput(editorRef.current));
  }

  const borderClass = isValid ? 'border-outline/30' : 'border-red-400/70';

  return (
    <div className="relative flex-1">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Function expression"
        aria-multiline="false"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        className={`bg-surface-container-low border rounded-lg px-3 py-1.5 text-sm font-mono text-on-surface outline-none focus:border-primary/50 min-h-[2rem] leading-relaxed ${borderClass}`}
      />
      {!value && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-on-surface-variant/40 pointer-events-none select-none">
          {placeholder}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
cd frontend && npx vitest run src/components/graph/GraphFunctionInput.test.jsx
```
Expected: all tests PASS

- [ ] **Step 5: Run full suite to confirm no regressions**

```
cd frontend && npx vitest run
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```
git add frontend/src/components/graph/GraphFunctionInput.jsx frontend/src/components/graph/GraphFunctionInput.test.jsx
git commit -m "feat(graph): add GraphFunctionInput contenteditable with live superscript support"
```

---

### Task 3: Wire `GraphFunctionInput` into `FunctionList` + color picker

**Files:**
- Modify: `components/graph/FunctionList.jsx`
- Modify: `components/graph/FunctionList.test.jsx`

**Interfaces:**
- Consumes: `GraphFunctionInput` from `./GraphFunctionInput`
- `handleColorChange(id: string, color: string): void` — new handler, mirrors `handleExpressionChange`

- [ ] **Step 1: Update `FunctionList.jsx`**

Replace the entire file content:

```jsx
import { compileExpression } from '../../utils/graphEvaluator';
import GraphFunctionInput from './GraphFunctionInput';

const COLOR_PALETTE = [
  '#5af0b3',
  '#60a5fa',
  '#f472b6',
  '#fbbf24',
  '#a78bfa',
  '#fb7185',
  '#34d399',
  '#38bdf8',
];

let nextId = 0;
function generateId() {
  nextId += 1;
  return `fn-${nextId}`;
}

export function createFunction(index = 0) {
  return {
    id: generateId(),
    expression: '',
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
  };
}

function isValid(expression) {
  if (!expression.trim()) return true;
  try {
    compileExpression(expression);
    return true;
  } catch {
    return false;
  }
}

export default function FunctionList({ functions, onChange }) {
  function handleAdd() {
    onChange([...functions, createFunction(functions.length)]);
  }

  function handleExpressionChange(id, expression) {
    onChange(functions.map((fn) => (fn.id === id ? { ...fn, expression } : fn)));
  }

  function handleColorChange(id, color) {
    onChange(functions.map((fn) => (fn.id === id ? { ...fn, color } : fn)));
  }

  function handleRemove(id) {
    onChange(functions.filter((fn) => fn.id !== id));
  }

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto h-full">
      {functions.map((fn) => (
        <div key={fn.id} className="flex items-center gap-2">
          <label
            className="w-3 h-3 rounded-full shrink-0 cursor-pointer block"
            style={{ backgroundColor: fn.color }}
            aria-label={`Change color for function ${fn.id}`}
          >
            <input
              type="color"
              value={fn.color}
              onChange={(e) => handleColorChange(fn.id, e.target.value)}
              className="sr-only"
              tabIndex={-1}
            />
          </label>
          <GraphFunctionInput
            value={fn.expression}
            onChange={(expr) => handleExpressionChange(fn.id, expr)}
            placeholder="y = f(x)"
            isValid={isValid(fn.expression)}
          />
          <button
            type="button"
            onClick={() => handleRemove(fn.id)}
            title="Remove function"
            className="text-on-surface-variant hover:text-red-400 cursor-pointer px-1"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="self-start text-primary text-sm font-mono hover:text-primary-fixed-dim cursor-pointer mt-1"
      >
        + Add function
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update `FunctionList.test.jsx`**

Replace the entire file content:

```jsx
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
});
```

- [ ] **Step 3: Run the updated FunctionList tests**

```
cd frontend && npx vitest run src/components/graph/FunctionList.test.jsx
```
Expected: all tests PASS

- [ ] **Step 4: Run the full test suite**

```
cd frontend && npx vitest run
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```
git add frontend/src/components/graph/FunctionList.jsx frontend/src/components/graph/FunctionList.test.jsx
git commit -m "feat(graph): wire GraphFunctionInput and color picker into FunctionList"
```
