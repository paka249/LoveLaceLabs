# Graph Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Desmos-style function grapher at `/graph`, reached from the sidebar — a canvas plot on top, a multi-function text-input list on the bottom, real plotting with a fixed viewport (no pan/zoom this pass).

**Architecture:** A new synchronous expression compiler (`graphEvaluator.js`) turns a typed expression into a reusable `(x) => number` closure, reusing the same implicit-multiplication rules the existing calculator already established. A hand-rolled `<canvas>` component samples each visible function once per horizontal pixel and strokes a curve, breaking the line at non-finite samples. The Sidebar's Calculator/Graph nav items become real routes; a new `AppShell` component extracts the repeated page chrome so the second real page doesn't duplicate it.

**Tech Stack:** React, react-router-dom (already installed, previously used only for `/login`), Vitest + Testing Library. No new dependencies.

## Global Constraints

- No pan/zoom in this pass — fixed viewport, x/y −10 to 10, 1:1 aspect ratio preserved.
- Function input is plain text only — not the structured math-template editor used elsewhere in the app.
- Only the Calculator and Graph sidebar nav items become real routes/links this pass; every other nav item (Calculus, Linear Algebra, Statistics, Library, Finance) stays exactly the inert `<a href="#">` placeholder it is today.
- A domain error at a specific x (division by zero, negative-argument sqrt, etc.) produces a gap in that curve, not a crash or a spike across the canvas.
- An unparseable expression marks its row with an error state and is skipped when drawing — it must not stop other valid functions from plotting.
- Canvas tests stay structural (renders, calls `getContext`, calls expected drawing methods) — jsdom's canvas context is a no-op stub, so pixel-level correctness is verified by viewing the running page, not asserted in tests.

---

## File Structure

**New:**
- `frontend/src/utils/graphEvaluator.js` — `compileExpression(expr) → (x) => number`.
- `frontend/src/utils/graphEvaluator.test.js`
- `frontend/src/components/graph/FunctionList.jsx` — the function input list; also exports `createFunction(index)`.
- `frontend/src/components/graph/FunctionList.test.jsx`
- `frontend/src/components/graph/GraphCanvas.jsx` — the canvas plot.
- `frontend/src/components/graph/GraphCanvas.test.jsx`
- `frontend/src/components/layout/AppShell.jsx` — extracted Sidebar+TopAppBar+ChatbotWidget shell.
- `frontend/src/components/layout/AppShell.test.jsx`
- `frontend/src/pages/Graph.jsx` — the page, composes `FunctionList` + `GraphCanvas` inside `AppShell`.
- `frontend/src/pages/Graph.test.jsx`
- `frontend/src/components/layout/Sidebar.test.jsx` — no existing test file for this component.

**Modified:**
- `frontend/src/utils/mathEvaluator.js` — export the existing `normalizeImplicitMultiplication` (currently module-private) so `graphEvaluator.js` can reuse it; no behavior change.
- `frontend/src/components/layout/Sidebar.jsx` — Calculator/Graph nav items become real, route-aware links.
- `frontend/src/App.jsx` — extract `Home` to use `AppShell`, add the `/graph` route.
- `frontend/src/setupTests.js` — add global jsdom stubs for `HTMLCanvasElement.prototype.getContext` and `ResizeObserver` (neither exists in jsdom), so any test that renders `GraphCanvas` (directly or via a page) doesn't crash by default.

---

### Task 1: Expression evaluator

**Files:**
- Modify: `frontend/src/utils/mathEvaluator.js`
- Create: `frontend/src/utils/graphEvaluator.js`
- Create: `frontend/src/utils/graphEvaluator.test.js`

**Interfaces:**
- Produces: `compileExpression(expr: string): (x: number) => number` — throws an `Error` if `expr` is empty, contains unsupported syntax, or fails to construct as a function. The returned closure never throws: a runtime domain error (division by zero, negative-argument `sqrt`, etc.) or a non-finite/non-numeric result returns `NaN` instead.
- Consumes: `normalizeImplicitMultiplication` from `mathEvaluator.js` (module-private today, exported by this task's first step).

- [ ] **Step 1: Export the existing implicit-multiplication helper**

In `frontend/src/utils/mathEvaluator.js`, find the line:

```js
function normalizeImplicitMultiplication(expr) {
```

Change it to:

```js
export function normalizeImplicitMultiplication(expr) {
```

That's the only change to this file — everything else is untouched. This function already correctly turns `2x` into `2*x`, `3sin(x)` into `3*sin(x)`, etc., without breaking known function names like `sin`/`cos`/`log` into letter-by-letter multiplication (it protects them via a placeholder swap first). `graphEvaluator.js` reuses it as-is rather than re-deriving the same regex logic.

- [ ] **Step 2: Run the full frontend suite to confirm nothing broke**

Run: `cd frontend && npx vitest run`
Expected: all existing tests still PASS, same count as before this change — this step only adds an `export` keyword, no behavior changed. (Note: `mathEvaluator.js` has no dedicated test file today, so this is a whole-suite sanity check rather than a targeted one.)

- [ ] **Step 3: Write the failing test, `frontend/src/utils/graphEvaluator.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { compileExpression } from './graphEvaluator';

describe('compileExpression', () => {
  it('evaluates a simple linear expression', () => {
    const f = compileExpression('2x + 1');
    expect(f(3)).toBeCloseTo(7);
    expect(f(0)).toBeCloseTo(1);
  });

  it('supports ^ as exponentiation', () => {
    const f = compileExpression('x^2');
    expect(f(3)).toBeCloseTo(9);
    expect(f(-4)).toBeCloseTo(16);
  });

  it('supports implicit multiplication like 3x^2', () => {
    const f = compileExpression('3x^2');
    expect(f(2)).toBeCloseTo(12);
  });

  it('supports trig functions', () => {
    const f = compileExpression('sin(x)');
    expect(f(0)).toBeCloseTo(0);
    expect(f(Math.PI / 2)).toBeCloseTo(1);
  });

  it('supports sqrt', () => {
    const f = compileExpression('sqrt(x)');
    expect(f(9)).toBeCloseTo(3);
  });

  it('supports pi and e constants', () => {
    const f = compileExpression('pi + e');
    expect(f(0)).toBeCloseTo(Math.PI + Math.E);
  });

  it('throws on an empty expression', () => {
    expect(() => compileExpression('')).toThrow();
    expect(() => compileExpression('   ')).toThrow();
  });

  it('throws on unparseable syntax', () => {
    expect(() => compileExpression('x +* 2')).toThrow();
  });

  it('throws on disallowed identifiers instead of executing arbitrary code', () => {
    expect(() => compileExpression('alert(1)')).toThrow();
    expect(() => compileExpression('window.location')).toThrow();
  });

  it('returns NaN for a domain error at a specific point rather than throwing', () => {
    const f = compileExpression('1/x');
    expect(f(0)).toBeNaN();
    expect(f(2)).toBeCloseTo(0.5);
  });

  it('returns NaN for sqrt of a negative number', () => {
    const f = compileExpression('sqrt(x)');
    expect(f(-1)).toBeNaN();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/graphEvaluator.test.js`
Expected: FAIL — cannot find module `./graphEvaluator`

- [ ] **Step 5: Write `frontend/src/utils/graphEvaluator.js`**

```js
import { normalizeImplicitMultiplication } from './mathEvaluator';

const REPLACEMENTS = [
  [/\bpi\b/gi, 'Math.PI'],
  [/π/g, 'Math.PI'],
  [/\be\b/g, 'Math.E'],
  [/√\(/g, 'Math.sqrt('],
  [/\bsqrt\(/g, 'Math.sqrt('],
  [/\babs\(/g, 'Math.abs('],
  [/\bfloor\(/g, 'Math.floor('],
  [/\bceil\(/g, 'Math.ceil('],
  [/\bln\(/g, 'Math.log('],
  [/\blog10\(/g, 'Math.log10('],
  [/\blog\(/g, 'Math.log10('],
  [/\basin\(/g, 'Math.asin('],
  [/\bacos\(/g, 'Math.acos('],
  [/\batan\(/g, 'Math.atan('],
  [/\bsin\(/g, 'Math.sin('],
  [/\bcos\(/g, 'Math.cos('],
  [/\btan\(/g, 'Math.tan('],
  [/×/g, '*'],
  [/÷/g, '/'],
  [/\^/g, '**'],
];

const SAFE_TOKEN =
  /Math\.(?:PI|E|sqrt|abs|floor|ceil|log10|asin|acos|atan|sin|cos|tan)|\d+\.?\d*|\.\d+|x|[+\-*/%().,]|\s+/g;

function toJsExpression(expr) {
  let js = normalizeImplicitMultiplication(expr.trim());
  for (const [pattern, replacement] of REPLACEMENTS) {
    js = js.replace(pattern, replacement);
  }
  return js;
}

export function compileExpression(expr) {
  if (typeof expr !== 'string' || !expr.trim()) {
    throw new Error('Expression is empty.');
  }

  const jsExpr = toJsExpression(expr);
  const unsafeRemainder = jsExpr.replace(SAFE_TOKEN, '');
  if (unsafeRemainder.length > 0) {
    throw new Error(`Unsupported syntax near "${unsafeRemainder[0]}".`);
  }

  let fn;
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function('x', `"use strict"; return (${jsExpr});`);
    fn(1);
  } catch {
    throw new Error(`Could not parse expression: ${expr}`);
  }

  return function evaluateAt(x) {
    try {
      const y = fn(x);
      return typeof y === 'number' && Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/graphEvaluator.test.js`
Expected: PASS (11 tests)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/utils/mathEvaluator.js frontend/src/utils/graphEvaluator.js frontend/src/utils/graphEvaluator.test.js
git commit -m "feat(graph): add synchronous expression evaluator for plotting"
```

---

### Task 2: Function input list

**Files:**
- Create: `frontend/src/components/graph/FunctionList.jsx`
- Create: `frontend/src/components/graph/FunctionList.test.jsx`

**Interfaces:**
- Consumes: `compileExpression` from `frontend/src/utils/graphEvaluator.js` (Task 1) — used only to determine per-row error styling, not for drawing.
- Produces: default export `FunctionList({ functions, onChange })` where `functions` is `{ id: string, expression: string, color: string }[]` and `onChange(nextFunctions)` is called on every add/edit/remove. Named export `createFunction(index: number)` returns a new function object with a color chosen from a fixed palette by `index % paletteLength` — this is also what later tasks (Task 6) use to seed the initial function list.

- [ ] **Step 1: Write the failing test, `frontend/src/components/graph/FunctionList.test.jsx`**

```jsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/graph/FunctionList.test.jsx`
Expected: FAIL — cannot find module `./FunctionList`

- [ ] **Step 3: Write `frontend/src/components/graph/FunctionList.jsx`**

```jsx
import { compileExpression } from '../../utils/graphEvaluator';

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

  function handleRemove(id) {
    onChange(functions.filter((fn) => fn.id !== id));
  }

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto h-full">
      {functions.map((fn) => (
        <div key={fn.id} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: fn.color }}
            aria-hidden="true"
          />
          <input
            type="text"
            value={fn.expression}
            onChange={(e) => handleExpressionChange(fn.id, e.target.value)}
            placeholder="y = f(x)"
            className={`flex-1 bg-surface-container-low border rounded-lg px-3 py-1.5 text-sm font-mono text-on-surface outline-none focus:border-primary/50 ${
              isValid(fn.expression) ? 'border-outline/30' : 'border-red-400/70'
            }`}
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/graph/FunctionList.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/graph/FunctionList.jsx frontend/src/components/graph/FunctionList.test.jsx
git commit -m "feat(graph): add the function input list"
```

---

### Task 3: Canvas plot

**Files:**
- Modify: `frontend/src/setupTests.js`
- Create: `frontend/src/components/graph/GraphCanvas.jsx`
- Create: `frontend/src/components/graph/GraphCanvas.test.jsx`

**Interfaces:**
- Consumes: `compileExpression` from `frontend/src/utils/graphEvaluator.js` (Task 1).
- Produces: default export `GraphCanvas({ functions })` where `functions` is the same `{ id, expression, color }[]` shape `FunctionList` (Task 2) produces. No other exports.

- [ ] **Step 1: Add global canvas/ResizeObserver stubs to `frontend/src/setupTests.js`**

jsdom (the test environment) implements neither a real `<canvas>` 2D context nor `ResizeObserver`. Without a default stub, any test that renders `GraphCanvas` — including indirectly, via a page that contains it — throws immediately. Replace the file's contents with:

```js
import '@testing-library/jest-dom/vitest';

function createNoopCanvasContext() {
  return {
    setTransform() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return createNoopCanvasContext();
  };
}

if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
```

A test that wants to assert *which* drawing calls happened (this task's own `GraphCanvas.test.jsx`) overrides `HTMLCanvasElement.prototype.getContext` again in its own `beforeEach` with a spy-able fake — that's a per-file override of what this step establishes as the safe global default.

- [ ] **Step 2: Run the full frontend suite to confirm the stub doesn't break anything existing**

Run: `cd frontend && npx vitest run`
Expected: all existing tests still PASS — this step only adds stubs for two APIs jsdom doesn't implement; nothing existing calls them.

- [ ] **Step 3: Write the failing test, `frontend/src/components/graph/GraphCanvas.test.jsx`**

```jsx
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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/graph/GraphCanvas.test.jsx`
Expected: FAIL — cannot find module `./GraphCanvas`

- [ ] **Step 5: Write `frontend/src/components/graph/GraphCanvas.jsx`**

```jsx
import { useEffect, useRef } from 'react';
import { compileExpression } from '../../utils/graphEvaluator';

const VIEWPORT = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const GRID_COLOR = 'rgba(133, 148, 139, 0.15)';
const AXIS_COLOR = 'rgba(133, 148, 139, 0.6)';
const LABEL_COLOR = '#bbcac0';

export default function GraphCanvas({ functions }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const size = Math.min(width, height);
      const offsetX = (width - size) / 2;
      const offsetY = (height - size) / 2;

      function toPixel(x, y) {
        const px = offsetX + ((x - VIEWPORT.xMin) / (VIEWPORT.xMax - VIEWPORT.xMin)) * size;
        const py = offsetY + (1 - (y - VIEWPORT.yMin) / (VIEWPORT.yMax - VIEWPORT.yMin)) * size;
        return [px, py];
      }

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let gx = Math.ceil(VIEWPORT.xMin); gx <= VIEWPORT.xMax; gx += 1) {
        const [px] = toPixel(gx, 0);
        ctx.beginPath();
        ctx.moveTo(px, offsetY);
        ctx.lineTo(px, offsetY + size);
        ctx.stroke();
      }
      for (let gy = Math.ceil(VIEWPORT.yMin); gy <= VIEWPORT.yMax; gy += 1) {
        const [, py] = toPixel(0, gy);
        ctx.beginPath();
        ctx.moveTo(offsetX, py);
        ctx.lineTo(offsetX + size, py);
        ctx.stroke();
      }

      ctx.strokeStyle = AXIS_COLOR;
      ctx.lineWidth = 1.5;
      const [originX, originY] = toPixel(0, 0);
      ctx.beginPath();
      ctx.moveTo(offsetX, originY);
      ctx.lineTo(offsetX + size, originY);
      ctx.moveTo(originX, offsetY);
      ctx.lineTo(originX, offsetY + size);
      ctx.stroke();

      ctx.fillStyle = LABEL_COLOR;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let gx = Math.ceil(VIEWPORT.xMin); gx <= VIEWPORT.xMax; gx += 1) {
        if (gx === 0) continue;
        const [px] = toPixel(gx, 0);
        ctx.fillText(String(gx), px, originY + 4);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let gy = Math.ceil(VIEWPORT.yMin); gy <= VIEWPORT.yMax; gy += 1) {
        if (gy === 0) continue;
        const [, py] = toPixel(0, gy);
        ctx.fillText(String(gy), originX + 4, py);
      }

      functions.forEach((fn) => {
        if (!fn.expression.trim()) return;
        let evaluate;
        try {
          evaluate = compileExpression(fn.expression);
        } catch {
          return;
        }

        ctx.strokeStyle = fn.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let penDown = false;
        for (let px = 0; px <= size; px += 1) {
          const x = VIEWPORT.xMin + (px / size) * (VIEWPORT.xMax - VIEWPORT.xMin);
          const y = evaluate(x);
          if (!Number.isFinite(y) || y < VIEWPORT.yMin - 1 || y > VIEWPORT.yMax + 1) {
            penDown = false;
            continue;
          }
          const [cx, cy] = toPixel(x, y);
          if (!penDown) {
            ctx.moveTo(cx, cy);
            penDown = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        }
        ctx.stroke();
      });
    }

    draw();

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [functions]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-surface-container-low">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/graph/GraphCanvas.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/setupTests.js frontend/src/components/graph/GraphCanvas.jsx frontend/src/components/graph/GraphCanvas.test.jsx
git commit -m "feat(graph): add hand-rolled canvas plot with axes/grid/curves"
```

---

### Task 4: Shared page shell

**Files:**
- Create: `frontend/src/components/layout/AppShell.jsx`
- Create: `frontend/src/components/layout/AppShell.test.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Produces: default export `AppShell({ sidebarOpen, onToggleSidebar, chatbotDismissed, onDismissChatbot, onRestoreChatbot, children })` — renders `Sidebar` + the `<main>` wrapper (with `TopAppBar` then `children`) + `ChatbotWidget`, byte-for-byte the same markup/classes `App.jsx`'s current `Home` inlines today.
- Consumes: `Sidebar` (`frontend/src/components/layout/Sidebar.jsx`), `TopAppBar` (`frontend/src/components/layout/TopAppBar.jsx`), `ChatbotWidget` (`frontend/src/components/chatbot/ChatbotWidget.jsx`) — all pre-existing, unchanged by this task.

- [ ] **Step 1: Write the failing test, `frontend/src/components/layout/AppShell.test.jsx`**

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppShell from './AppShell';
import * as AuthContext from '../../auth/AuthContext';

vi.mock('../chatbot/ChatbotWidget', () => ({
  default: () => <div data-testid="chatbot-widget" />,
}));

describe('AppShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the sidebar, top bar, and children', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null, loading: false, logout: vi.fn() });

    render(
      <MemoryRouter>
        <AppShell
          sidebarOpen={true}
          onToggleSidebar={vi.fn()}
          chatbotDismissed={true}
          onDismissChatbot={vi.fn()}
          onRestoreChatbot={vi.fn()}
        >
          <div data-testid="page-content">Hello</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('LovelaceLabs')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByTestId('chatbot-widget')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/AppShell.test.jsx`
Expected: FAIL — cannot find module `./AppShell`

- [ ] **Step 3: Write `frontend/src/components/layout/AppShell.jsx`**

```jsx
import Sidebar from './Sidebar';
import TopAppBar from './TopAppBar';
import ChatbotWidget from '../chatbot/ChatbotWidget';

export default function AppShell({
  sidebarOpen,
  onToggleSidebar,
  chatbotDismissed,
  onDismissChatbot,
  onRestoreChatbot,
  children,
}) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar open={sidebarOpen} onToggle={onToggleSidebar} onRestoreChatbot={onRestoreChatbot} />

      <main
        className="min-h-screen blueprint-grid transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '208px' : '64px' }}
      >
        <TopAppBar sidebarOpen={sidebarOpen} />
        {children}
      </main>

      <ChatbotWidget dismissed={chatbotDismissed} onDismiss={onDismissChatbot} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/AppShell.test.jsx`
Expected: PASS (1 test)

- [ ] **Step 5: Refactor `frontend/src/App.jsx`'s `Home` to use `AppShell`**

Replace the full file:

```jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import AppShell from './components/layout/AppShell';
import IntelligenceHub from './components/dashboard/IntelligenceHub';
import Login from './pages/Login';
import { AuthProvider } from './auth/AuthContext';
import { usePersistedState } from './components/chatbot/usePersistedState';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Home({ sidebarOpen, onToggleSidebar, chatbotDismissed, onDismissChatbot, onRestoreChatbot }) {
  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onToggleSidebar={onToggleSidebar}
      chatbotDismissed={chatbotDismissed}
      onDismissChatbot={onDismissChatbot}
      onRestoreChatbot={onRestoreChatbot}
    >
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
        <IntelligenceHub />
      </div>
    </AppShell>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatbotDismissed, setChatbotDismissed] = usePersistedState('chatbot:dismissed', false);

  const sharedShellProps = {
    sidebarOpen,
    onToggleSidebar: () => setSidebarOpen((v) => !v),
    chatbotDismissed,
    onDismissChatbot: () => setChatbotDismissed(true),
    onRestoreChatbot: () => setChatbotDismissed(false),
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Home {...sharedShellProps} />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
```

(The `/graph` route is added in Task 6, once `Graph.jsx` exists — this step only does the `AppShell` extraction, keeping the app's current behavior identical.)

- [ ] **Step 6: Run the full frontend suite to confirm the refactor changed nothing observable**

Run: `cd frontend && npx vitest run`
Expected: all tests PASS, same count as before this task (plus the 1 new `AppShell` test).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/layout/AppShell.jsx frontend/src/components/layout/AppShell.test.jsx frontend/src/App.jsx
git commit -m "refactor(layout): extract AppShell so a second page doesn't duplicate the chrome"
```

---

### Task 5: Route-aware sidebar navigation

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.jsx`
- Create: `frontend/src/components/layout/Sidebar.test.jsx`

**Interfaces:**
- No change to `Sidebar`'s existing props (`{ open, onToggle, onRestoreChatbot }`).
- `Sidebar` now requires a Router context (`useLocation`) — already satisfied everywhere it's rendered today (inside `AppShell`, inside `BrowserRouter`), but any test rendering `Sidebar` (or `AppShell`) directly must wrap it in a `MemoryRouter`. `AppShell.test.jsx` (Task 4) already does this.

- [ ] **Step 1: Write the failing test, `frontend/src/components/layout/Sidebar.test.jsx`**

```jsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  afterEach(() => {
    cleanup();
  });

  it('highlights Calculator as active on the root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar open={true} onToggle={() => {}} onRestoreChatbot={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Calculator').closest('a')).toHaveClass('text-primary');
    expect(screen.getByText('Graph').closest('a')).not.toHaveClass('text-primary');
  });

  it('highlights Graph as active on the /graph route', () => {
    render(
      <MemoryRouter initialEntries={['/graph']}>
        <Sidebar open={true} onToggle={() => {}} onRestoreChatbot={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Graph').closest('a')).toHaveClass('text-primary');
    expect(screen.getByText('Calculator').closest('a')).not.toHaveClass('text-primary');
  });

  it('links Calculator to / and Graph to /graph', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar open={true} onToggle={() => {}} onRestoreChatbot={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Calculator').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Graph').closest('a')).toHaveAttribute('href', '/graph');
  });

  it('still renders non-linked items (e.g. Calculus) as inert placeholders', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar open={true} onToggle={() => {}} onRestoreChatbot={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Calculus').closest('a')).toHaveAttribute('href', '#');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.jsx`
Expected: FAIL on 2 of the 4 tests. "highlights Calculator as active on the root route" and "still renders non-linked items... as inert placeholders" pass even before this change (they coincidentally match today's hardcoded `active: true` on Calculator and today's `href="#"` on every item). "highlights Graph as active on the /graph route" and "links Calculator to / and Graph to /graph" fail, since neither item is a real route yet.

- [ ] **Step 3: Modify `frontend/src/components/layout/Sidebar.jsx`**

Replace the top of the file, from the imports through the end of the `NavItem` function (everything from `export default function Sidebar` onward is unchanged):

```jsx
import { Link, useLocation } from 'react-router-dom';
import bookImg from '../../assets/book.png';
import settingsImg from '../../assets/settings.png';
import financeImg from '../../assets/finance.svg';
import graphImg from '../../assets/graph.svg';
import calcIcon from '../../assets/icon-calculator.svg';
import calculusIcon from '../../assets/icon-calculus.svg';
import linearIcon from '../../assets/icon-linear.svg';
import statsIcon from '../../assets/icon-stats.svg';
import helpIcon from '../../assets/icon-help.svg';
import adaAvatar from '../../assets/adaAvatar';

const LOGO = '/favicon.jpeg';

const NAV_WORKSPACE = [
  { img: calcIcon, label: 'Calculator', path: '/' },
  { img: calculusIcon, label: 'Calculus' },
  { img: linearIcon, label: 'Linear Algebra' },
  { img: statsIcon, label: 'Statistics' },
  { img: bookImg, label: 'Library' },
  { img: financeImg, label: 'Finance' },
  { img: graphImg, label: 'Graph', path: '/graph' },
];

function NavItem({ icon, img, label, path, open }) {
  const location = useLocation();
  const active = path !== undefined && location.pathname === path;
  const base =
    'flex items-center gap-3 px-3 py-2 transition-all duration-200 cursor-pointer text-[11px] tracking-[0.05em] font-bold uppercase font-mono';
  const activeClass =
    'text-primary border-r-2 border-primary translate-x-1 bg-[rgba(52,211,153,0.15)]';
  const inactiveClass =
    'text-on-surface-variant hover:bg-surface-container-high hover:text-primary';
  const className = `${base} ${active ? activeClass : inactiveClass} ${!open ? 'justify-center' : ''}`;

  const content = (
    <>
      {img
        ? <img src={img} alt={label} className="w-5 h-5 object-contain opacity-80 shrink-0" />
        : <span className="material-symbols-outlined text-[20px] shrink-0">{icon}</span>
      }
      {open && <span>{label}</span>}
    </>
  );

  if (path !== undefined) {
    return (
      <Link to={path} title={!open ? label : undefined} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href="#" title={!open ? label : undefined} className={className}>
      {content}
    </a>
  );
}
```

The rest of the file (`export default function Sidebar(...)` and everything inside it — brand header, `NAV_WORKSPACE.map`, Settings/Support/Ada/Collapse buttons) is unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: all tests PASS, including `AppShell.test.jsx` from Task 4 (which renders `Sidebar` indirectly and needs the `MemoryRouter` it already wraps with).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/Sidebar.jsx frontend/src/components/layout/Sidebar.test.jsx
git commit -m "feat(graph): wire Sidebar's Calculator/Graph items to real routes"
```

---

### Task 6: Graph page, route wiring, and manual verification

**Files:**
- Create: `frontend/src/pages/Graph.jsx`
- Create: `frontend/src/pages/Graph.test.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `AppShell` (Task 4), `FunctionList`/`createFunction` (Task 2), `GraphCanvas` (Task 3).
- `Graph` takes the same shell props `Home` does: `{ sidebarOpen, onToggleSidebar, chatbotDismissed, onDismissChatbot, onRestoreChatbot }`.

- [ ] **Step 1: Write the failing test, `frontend/src/pages/Graph.test.jsx`**

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Graph from './Graph';
import * as AuthContext from '../auth/AuthContext';

vi.mock('../components/chatbot/ChatbotWidget', () => ({
  default: () => <div data-testid="chatbot-widget" />,
}));

describe('Graph page', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders one empty function row and a canvas by default', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null, loading: false, logout: vi.fn() });

    const { container } = render(
      <MemoryRouter>
        <Graph
          sidebarOpen={true}
          onToggleSidebar={vi.fn()}
          chatbotDismissed={true}
          onDismissChatbot={vi.fn()}
          onRestoreChatbot={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByPlaceholderText('y = f(x)')).toHaveLength(1);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/Graph.test.jsx`
Expected: FAIL — cannot find module `./Graph`

- [ ] **Step 3: Write `frontend/src/pages/Graph.jsx`**

```jsx
import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import FunctionList, { createFunction } from '../components/graph/FunctionList';
import GraphCanvas from '../components/graph/GraphCanvas';

export default function Graph({
  sidebarOpen,
  onToggleSidebar,
  chatbotDismissed,
  onDismissChatbot,
  onRestoreChatbot,
}) {
  const [functions, setFunctions] = useState(() => [createFunction(0)]);

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onToggleSidebar={onToggleSidebar}
      chatbotDismissed={chatbotDismissed}
      onDismissChatbot={onDismissChatbot}
      onRestoreChatbot={onRestoreChatbot}
    >
      <div className="flex flex-col h-screen pt-16">
        <GraphCanvas functions={functions} />
        <div className="h-64 border-t border-outline/20 bg-surface-container">
          <FunctionList functions={functions} onChange={setFunctions} />
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/Graph.test.jsx`
Expected: PASS (1 test)

- [ ] **Step 5: Wire the `/graph` route into `frontend/src/App.jsx`**

Add the import and the route — the file becomes:

```jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import AppShell from './components/layout/AppShell';
import IntelligenceHub from './components/dashboard/IntelligenceHub';
import Login from './pages/Login';
import Graph from './pages/Graph';
import { AuthProvider } from './auth/AuthContext';
import { usePersistedState } from './components/chatbot/usePersistedState';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Home({ sidebarOpen, onToggleSidebar, chatbotDismissed, onDismissChatbot, onRestoreChatbot }) {
  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onToggleSidebar={onToggleSidebar}
      chatbotDismissed={chatbotDismissed}
      onDismissChatbot={onDismissChatbot}
      onRestoreChatbot={onRestoreChatbot}
    >
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
        <IntelligenceHub />
      </div>
    </AppShell>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatbotDismissed, setChatbotDismissed] = usePersistedState('chatbot:dismissed', false);

  const sharedShellProps = {
    sidebarOpen,
    onToggleSidebar: () => setSidebarOpen((v) => !v),
    chatbotDismissed,
    onDismissChatbot: () => setChatbotDismissed(true),
    onRestoreChatbot: () => setChatbotDismissed(false),
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/graph" element={<Graph {...sharedShellProps} />} />
            <Route path="*" element={<Home {...sharedShellProps} />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
```

- [ ] **Step 6: Run the full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: all tests PASS (existing suite + every test added across Tasks 1-6).

- [ ] **Step 7: Manually verify in a real browser**

Run: `cd frontend && npm run dev`, open `http://localhost:5173`.

1. Click "Graph" in the sidebar → URL becomes `/graph`, "Graph" is highlighted in the sidebar instead of "Calculator."
2. Confirm axes, gridlines, and tick labels render, centered, roughly square.
3. Type `x^2` into the function row → a parabola plots in that row's color.
4. Click "+ Add function," type `sin(x)` → a second curve plots in a different color, both visible at once.
5. Type an intentionally broken expression (e.g. `x +* 2`) into a row → that row's input gets a red border, its curve disappears, the other curve(s) keep plotting normally.
6. Type `1/x` → confirm the curve has a visible gap at `x = 0` rather than a vertical line spanning the canvas.
7. Click "Calculator" in the sidebar → URL returns to `/`, calculator renders normally, "Calculator" is highlighted again.
8. Resize the browser window → the plot resizes and stays centered/square.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Graph.jsx frontend/src/pages/Graph.test.jsx frontend/src/App.jsx
git commit -m "feat(graph): add the /graph page and wire it into the app"
```

---

## Self-Review Notes

- **Spec coverage:** expression evaluator (Task 1), function input list with add/remove/error-state (Task 2), canvas rendering with axes/grid/labels/curves/gap-on-domain-error (Task 3), shared shell to avoid duplicating chrome for the second page (Task 4), Calculator/Graph-only route wiring with everything else left as inert placeholders (Task 5), the page itself plus manual verification of the fixed 1:1 viewport (Task 6). Every spec section has a corresponding task.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.
- **Type consistency:** the function shape `{ id, expression, color }` is used identically by `createFunction`/`FunctionList` (Task 2), `GraphCanvas` (Task 3), and `Graph` (Task 6) — checked for drift, none found. `compileExpression`'s contract (throws on bad input, returned closure never throws) is relied on identically by `FunctionList` (for error-border styling) and `GraphCanvas` (for skip-and-continue drawing) — both call sites wrap it in their own `try/catch` rather than assuming the other's handling, so neither can crash the other.
