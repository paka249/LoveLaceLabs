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
            onAddFunction={handleAdd}
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
