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
