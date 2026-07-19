# Graph Feature — Design

## Summary

A Desmos-style function grapher, reached by clicking "Graph" in the sidebar
(currently a visual placeholder). The page splits horizontally: a canvas
plot on top, a list of function inputs on the bottom. Multiple functions can
be entered at once, each rendered in its own color. This first pass plots
real functions for real — it's a first version to iterate on, not a fake
mockup — but deliberately ships without pan/zoom, which is scoped as a
follow-up once the core plotting is solid.

## Scope

In scope for this pass:
- A new `/graph` route and page, reachable from the sidebar.
- Multiple function inputs (add, edit, remove), each auto-assigned a
  distinct color.
- A new, small, synchronous expression evaluator purpose-built for
  repeated numeric sampling (the existing calculator evaluator is async,
  one-shot, and unsuited to this).
- Hand-rolled `<canvas>` rendering: axes, gridlines, tick labels, and one
  curve per visible function, with a fixed default viewport
  (x/y −10 to 10, 1:1 aspect ratio).
- Graceful handling of domain errors (division by zero, sqrt of a negative
  number, etc.) — a gap in the curve at that point, not a garbage spike
  across the canvas.
- Wiring the Sidebar's Calculator and Graph nav items to real routes, and
  extracting the shared page shell (Sidebar/TopAppBar/ChatbotWidget) so a
  second real page doesn't duplicate it.

Explicitly out of scope for this pass (follow-up work):
- Pan (drag) and zoom (scroll) — fixed viewport only, by explicit choice.
- Any other sidebar nav item (Calculus, Linear Algebra, Statistics,
  Library, Finance) becoming a real page — they stay exactly the inert
  placeholders they are today.
- Reusing the structured math-template editor (`MathExpressionField`) for
  function input — plain text inputs only, matching the "first pass"
  scope; the structured editor could replace this later without changing
  anything else about the feature.
- Implicit/piecewise/parametric/polar functions, sliders, or any other
  Desmos feature beyond "type y = f(x), see it plotted."

## Architecture

### Routing & shared shell

`App.jsx` currently has exactly one non-`/login` route: a catch-all `*`
rendering a `Home` component that inlines Sidebar + TopAppBar +
content + ChatbotWidget directly. Adding a second real page the same way
would duplicate that shell. Instead:

- **`frontend/src/components/layout/AppShell.jsx`** (new) — takes
  `{ sidebarOpen, onToggleSidebar, chatbotDismissed, onDismissChatbot,
  onRestoreChatbot, children }`, renders `Sidebar` + the `<main>` wrapper
  (TopAppBar + `children`) + `ChatbotWidget`, exactly matching today's
  `Home` markup/classes. `children` is the only thing that varies between
  pages.
- `App.jsx`'s `Home` becomes a thin wrapper: `AppShell` around the existing
  centered `IntelligenceHub` content.
- **`frontend/src/pages/Graph.jsx`** (new) — `AppShell` around the new
  split-panel graph content. Registered as a new route,
  `<Route path="/graph" element={<Graph ... />} />`, alongside the
  existing `/login` and `*` routes.

### Sidebar navigation

`Sidebar.jsx`'s `NavItem` currently renders a plain `<a href="#">` for
every entry, with `active` hardcoded per-item in the `NAV_WORKSPACE` array
(only Calculator has `active: true`, unconditionally). This pass:

- Adds a `path` field to the Calculator (`/`) and Graph (`/graph`) entries
  in `NAV_WORKSPACE` only — the rest keep no `path` and render exactly as
  they do today.
- `NavItem` renders a real `Link` (react-router-dom) when a `path` is
  present, an inert `<a href="#">` otherwise (unchanged behavior for the
  still-placeholder items).
- `active` is derived from `useLocation()` matching `path`, replacing the
  hardcoded flag — so navigating to `/graph` correctly highlights "Graph"
  and un-highlights "Calculator," and vice versa.

### Expression evaluator

**`frontend/src/utils/graphEvaluator.js`** (new) exports:

```
compileExpression(expr: string): (x: number) => number
```

Throws (or the caller catches) on unparseable input — the function-list
row shows an error state for that row rather than crashing the page.

The existing `frontend/src/utils/mathEvaluator.js` is not reused directly:
it's `async` (dynamic-imports `nerdamer` per call), returns a single
one-shot result, and is built around a heavier symbolic-first pipeline
that doesn't fit sampling a function at hundreds of x-values per redraw.
Instead, `graphEvaluator.js` ports the same *syntax* rules
`mathEvaluator.js`'s `parseExpression()` already establishes for this
app — implicit multiplication (`2x` → `2*x`), `^` → `**`, `sin`/`cos`/
`tan`/`sqrt`/`abs`/`log`/`ln`, `pi`/`π` → `Math.PI`, `e` → `Math.E` — as a
single-pass rewrite that ends in `new Function('x', `return ${jsExpr}`)`,
producing a reusable closure instead of evaluating one literal string.
This keeps what a user types in the graph consistent with what they'd
type in the calculator, without pulling in nerdamer or the async
plumbing that syntax rides on today.

Evaluation safety: each sampled point is checked with `Number.isFinite`.
A non-finite result (NaN from `sqrt(-1)`, `Infinity` from `1/x` at `x=0`,
etc.) breaks the line at that x — the canvas path lifts the pen rather
than drawing a point, and resumes cleanly on the next finite sample. This
is the standard fix for the classic naive-grapher bug where an asymptote
draws as a vertical line spanning the whole canvas.

### Canvas rendering

**`frontend/src/components/graph/GraphCanvas.jsx`** (new) owns a
`<canvas>` ref. On mount, on any function-list change, and on container
resize, it redraws from scratch:

1. Clear the canvas.
2. Draw gridlines at regular intervals (`--color-outline-variant` tone).
3. Draw the x and y axes, slightly brighter (`--color-outline`).
4. Draw tick labels at regular intervals (`--color-on-surface-variant`).
5. For each visible function: sample `compileExpression(fn.expression)`
   once per horizontal pixel across the fixed viewport, map each
   math-space `(x, y)` to canvas pixel-space via a linear transform, and
   stroke a path in `fn.color`, breaking the path at non-finite samples
   as described above.

Viewport is fixed at x/y −10 to 10 for this pass, with 1:1 aspect ratio
preserved (so `x^2` and a literal circle both render undistorted) —
computed against the canvas's actual pixel dimensions, which are kept in
sync with its container via `ResizeObserver` so the plot fills the top
half of the split view at any window size.

### Function list

**`frontend/src/components/graph/FunctionList.jsx`** (new) renders one
row per function: a color swatch (from a small fixed palette, cycled as
functions are added — distinct hues chosen for contrast against the dark
theme and against each other, not tied to the app's primary green), a
plain text `<input>` for the expression, and a delete button. An "add
function" button appends a new empty row with the next palette color.
Function state (`{ id, expression, color, visible }[]`) lives in
`Graph.jsx` and is passed to both `FunctionList` and `GraphCanvas`, so
edits in the bottom panel immediately redraw the top.

### Layout

Per the explicit ask — horizontal split, not Desmos's actual sidebar
layout: `Graph.jsx`'s content is a full-height flex column inside
`AppShell`. `GraphCanvas` takes the majority of the vertical space
(roughly two-thirds), `FunctionList` the remainder (scrollable if the
function list grows past the available height).

## Data flow

1. Visiting `/graph` (via sidebar click or direct URL) renders `Graph.jsx`
   inside `AppShell`, starting with one empty function row.
2. Typing an expression into a row updates that function's `expression`
   in state; `GraphCanvas` re-renders, calling `compileExpression` and
   redrawing.
3. An unparseable expression marks that row with an error state (e.g. a
   red border) and is skipped when drawing — other valid functions keep
   plotting normally.
4. Clicking "add function" appends a row with the next palette color.
   Clicking a row's delete button removes it and its curve.
5. Resizing the window/sidebar triggers a canvas resize and redraw at the
   new pixel dimensions, same fixed math-space viewport.

## Error handling

- Invalid expression syntax (e.g. unbalanced parens, an unknown function
  name): `compileExpression` throws; the function row shows an inline
  error indicator, the canvas simply doesn't draw that curve. No crash,
  no effect on other valid functions.
- Domain errors at specific points (division by zero, negative-argument
  `sqrt`/`log`, etc.): handled per-sample via `Number.isFinite`, producing
  a gap in that one curve rather than an error state for the whole
  function.
- Empty function row: not drawn, no error shown (a blank row is the
  normal "haven't typed anything yet" state, not an error).

## Testing

- **`graphEvaluator.js`**: Vitest unit tests — valid syntax across the
  ported rule set (`^`, implicit multiplication, trig, sqrt, pi/e),
  invalid syntax (confirms it throws rather than silently returning
  garbage), and domain errors (confirms `Number.isFinite` catches
  division-by-zero/negative-sqrt cases at the point of evaluation).
- **`FunctionList.jsx`**: Testing Library component tests — add a
  function, remove a function, edit an expression, confirms colors are
  assigned from the palette as rows are added.
- **`GraphCanvas.jsx`**: kept intentionally light. jsdom's canvas 2D
  context is a no-op stub, so pixel-level output isn't meaningfully unit
  -testable here — tests confirm the canvas element renders and that
  `getContext('2d')` is called with the expected sequence of drawing
  calls (spy-based), not actual pixel correctness. Real visual
  verification (gridlines look right, curves plot correctly, colors are
  distinct, asymptotes gap correctly) happens by viewing the running page
  before calling this done.
- **`Sidebar.jsx`**: existing test coverage (if any) extended to confirm
  the Graph link's `to`/active-state behavior; Calculator's active state
  no longer hardcoded, confirmed via a route-based test instead.

## Open questions for later (not blocking this pass)

- Whether to add pan/zoom, and if so, whether that's canvas coordinate
  math done by hand or a point where a plotting library becomes worth
  the tradeoff discussed earlier (declined for this pass in favor of
  hand-rolled canvas).
- Whether the function input should eventually adopt the structured
  math-template editor used elsewhere in the app.
- Whether other sidebar sections (Calculus, Linear Algebra, etc.) follow
  the same real-route pattern this establishes.
