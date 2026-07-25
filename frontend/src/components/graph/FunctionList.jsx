import { useEffect, useRef, useState } from 'react';
import {
  compileExpression,
  parseNamedDefinition,
  parseFunctionQuery,
  evaluateFunctionQuery,
} from '../../utils/graphEvaluator';
import { formatCoordinate } from './graphViewport';
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
    visible: true,
  };
}

// Names available for other rows to call as e.g. "y(1)" — every row of the
// form "y = ..." or "f(x) = ...", collected regardless of row order (Desmos
// doesn't require defining before referencing, so neither do we).
function collectDefinitions(functions) {
  const definitions = new Map();
  for (const fn of functions) {
    const def = parseNamedDefinition(fn.expression);
    if (def) definitions.set(def.name, def.body);
  }
  return definitions;
}

// Evaluate `expression` as a call like "y(1)", if it looks like one — else
// null (it's a plain curve, not a query).
function evaluateQuery(expression, definitions) {
  const query = parseFunctionQuery(expression, new Set(definitions.keys()));
  if (!query) return null;
  try {
    return { ok: true, value: evaluateFunctionQuery(query, definitions) };
  } catch {
    return { ok: false };
  }
}

function isValid(expression, definitions) {
  if (!expression.trim()) return true;
  const query = evaluateQuery(expression, definitions);
  if (query) return query.ok;
  try {
    compileExpression(expression);
    return true;
  } catch {
    return false;
  }
}

// Evaluate a row's own curve at a given x — scoped to that specific row, so
// unlike "y(1)" (which resolves by name and silently picks whichever "y ="
// row was defined last if there are duplicates) this is never ambiguous.
function evaluateAtX(expression, xInput) {
  if (!xInput.trim()) return null;
  try {
    const xValue = compileExpression(xInput)(0);
    if (!Number.isFinite(xValue)) {
      return { ok: false, message: `Could not evaluate "${xInput.trim()}".` };
    }
    const y = compileExpression(expression)(xValue);
    if (!Number.isFinite(y)) {
      return { ok: false, message: `Undefined at x = ${formatCoordinate(xValue)}.` };
    }
    return { ok: true, x: xValue, y };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export default function FunctionList({ functions, onChange }) {
  // Map of fn.id → contenteditable DOM element, populated by each GraphFunctionInput
  const inputRefs = useRef({});
  // When true, focus the last function input on the next render (after a new row is added)
  const focusLastRef = useRef(false);
  // Which rows have their "evaluate at x" panel open, and what they've typed
  // into it. Purely local UI state — not part of the persisted function data.
  const [openEvaluators, setOpenEvaluators] = useState(() => new Set());
  const [evalInputs, setEvalInputs] = useState({});

  useEffect(() => {
    if (focusLastRef.current && functions.length > 0) {
      focusLastRef.current = false;
      const lastId = functions[functions.length - 1].id;
      inputRefs.current[lastId]?.focus();
    }
  }, [functions]);

  function handleAdd() {
    onChange([...functions, createFunction(functions.length)]);
  }

  function handleExpressionChange(id, expression) {
    onChange(functions.map((fn) => (fn.id === id ? { ...fn, expression } : fn)));
  }

  function handleColorChange(id, color) {
    onChange(functions.map((fn) => (fn.id === id ? { ...fn, color } : fn)));
  }

  function toggleEvaluator(id) {
    setOpenEvaluators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleVisible(id) {
    // `!== false` (not a plain truthy check) so functions created before this
    // field existed still default to visible.
    onChange(functions.map((fn) => (fn.id === id ? { ...fn, visible: fn.visible === false } : fn)));
  }

  function handleRemove(id) {
    onChange(functions.filter((fn) => fn.id !== id));
  }

  const definitions = collectDefinitions(functions);

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto h-full">
      {functions.map((fn, idx) => {
        const visible = fn.visible !== false;
        const query = evaluateQuery(fn.expression, definitions);
        const evalOpen = openEvaluators.has(fn.id);
        const evalInput = evalInputs[fn.id] ?? '';
        const evalResult = evalOpen ? evaluateAtX(fn.expression, evalInput) : null;
        return (
        <div key={fn.id} className="flex flex-col gap-1">
          <div className={`flex items-center gap-2 ${visible ? '' : 'opacity-40'}`}>
            <button
              type="button"
              onClick={() => handleToggleVisible(fn.id)}
              title={visible ? 'Hide function' : 'Show function'}
              aria-pressed={visible}
              aria-label={`Toggle visibility for function ${fn.id}`}
              // Square (vs. the round color swatch next to it) so the two controls
              // are unmistakably different at a glance, not just on/off states of
              // the same shape.
              className="w-3 h-3 rounded-[2px] shrink-0 cursor-pointer border-2"
              style={{ backgroundColor: visible ? fn.color : 'transparent', borderColor: fn.color }}
            />
            <label
              className="w-3 h-3 rounded-full shrink-0 cursor-pointer block border border-outline/30"
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
              isValid={isValid(fn.expression, definitions)}
              onAddFunction={handleAdd}
              onEditorRef={(el) => {
                if (el) inputRefs.current[fn.id] = el;
                else delete inputRefs.current[fn.id];
              }}
              onMoveUp={() => {
                if (idx > 0) inputRefs.current[functions[idx - 1].id]?.focus();
              }}
              onMoveDown={() => {
                if (idx < functions.length - 1) {
                  inputRefs.current[functions[idx + 1].id]?.focus();
                } else {
                  focusLastRef.current = true;
                  onChange([...functions, createFunction(functions.length)]);
                }
              }}
            />
            {query?.ok && (
              <span className="text-sm font-mono text-on-surface-variant shrink-0">
                = {formatCoordinate(query.value)}
              </span>
            )}
            <button
              type="button"
              onClick={() => toggleEvaluator(fn.id)}
              title={evalOpen ? 'Hide value lookup' : 'Evaluate at a point'}
              aria-expanded={evalOpen}
              aria-label={`Evaluate function ${fn.id} at a point`}
              className="text-on-surface-variant hover:text-primary cursor-pointer px-1 text-xs font-mono shrink-0"
            >
              {evalOpen ? '▾' : '▸'} ƒ
            </button>
            <button
              type="button"
              onClick={() => handleRemove(fn.id)}
              title="Remove function"
              className="text-on-surface-variant hover:text-red-400 cursor-pointer px-1"
            >
              ×
            </button>
          </div>
          {evalOpen && (
            <div className="flex items-center gap-2 pl-9 text-sm font-mono">
              <span className="text-on-surface-variant">x =</span>
              <input
                type="text"
                value={evalInput}
                onChange={(e) => setEvalInputs((prev) => ({ ...prev, [fn.id]: e.target.value }))}
                placeholder="1"
                aria-label={`x value for function ${fn.id}`}
                className="w-20 bg-surface-container-low border border-outline/30 rounded px-2 py-0.5 text-on-surface outline-none focus:border-primary/50"
              />
              <span
                className={
                  evalResult?.ok
                    ? 'text-on-surface-variant'
                    : evalResult
                      ? 'text-red-400/80'
                      : 'text-on-surface-variant/40'
                }
              >
                {evalResult?.ok ? `y = ${formatCoordinate(evalResult.y)}` : (evalResult?.message ?? 'y = ?')}
              </span>
            </div>
          )}
        </div>
        );
      })}
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
