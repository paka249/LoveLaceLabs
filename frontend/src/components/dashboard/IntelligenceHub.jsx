import { useEffect, useRef, useState } from 'react';
import calcIcon from '../../assets/icon-calculator.svg';
import arrowIcon from '../../assets/icon-arrow.svg';
import Calculator from '../Calculator';
import { evaluate, formatResult, preloadSymbolicMath } from '../../utils/mathEvaluator';

export default function IntelligenceHub() {
  const [query, setQuery] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [angleMode, setAngleMode] = useState('rad'); // 'rad', 'deg', 'grad'
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (calcOpen) {
      preloadSymbolicMath().catch(() => {
        // Ignore preload failures here; evaluation will surface any real error.
      });
    }
  }, [calcOpen]);

  function showError(message) {
    setError(message);
    setTimeout(() => setError(''), 3000);
  }

  function applyResult(result) {
    if (result.success) {
      setQuery(formatResult(result.result));
      setError('');
      inputRef.current?.focus();
      return;
    }

    showError(result.error);
    inputRef.current?.focus();
  }

  function extractExpressionBody(expression) {
    const trimmed = expression.trim();
    const equalsIndex = trimmed.indexOf('=');

    if (equalsIndex === -1) {
      return trimmed;
    }

    return trimmed.slice(equalsIndex + 1).trim();
  }

  function inferSymbolicVariable(expression) {
    const reserved = new Set([
      'pi', 'e', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
      'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'ln', 'log',
      'log10', 'sqrt', 'root', 'lim', 'integrate', 'diff',
    ]);

    const body = extractExpressionBody(expression);
    const latinMatches = body.match(/\b[A-Za-z]+\b/g) ?? [];
    const greekMatches = body.match(/[α-ωΑ-Ω]/g) ?? [];
    const symbols = [...latinMatches, ...greekMatches]
      .filter((token) => !reserved.has(token.toLowerCase()));
    const uniqueSymbols = [...new Set(symbols)];

    if (uniqueSymbols.length === 1) {
      return uniqueSymbols[0];
    }

    return null;
  }

  async function compute() {
    if (!query.trim()) return;

    applyResult(await evaluate(query, angleMode));
  }

  async function handleAction(action) {
    if (!query.trim()) return;

    const expressionBody = extractExpressionBody(query);
    const variable = inferSymbolicVariable(query);

    if (action === 'Integral') {
      if (!variable) {
        showError('Multiple variables detected. Use explicit notation like ∫(f)d(x).');
        return;
      }

      applyResult(await evaluate(`∫(${expressionBody})d(${variable})`, angleMode));
      return;
    }

    if (action === 'Derivative') {
      if (!variable) {
        showError('Multiple variables detected. Use explicit notation like d/dx(f).');
        return;
      }

      applyResult(await evaluate(`d/d${variable}(${expressionBody})`, angleMode));
      return;
    }

    showError(`${action} is not available yet`);
  }

  function insertAtCursor(text, cursorOffset = 0) {
    const el = inputRef.current;
    if (!el) { setQuery((v) => v + text); return; }
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const currentValue = el.value;
    const next = currentValue.slice(0, start) + text + currentValue.slice(end);
    setQuery(next);
    requestAnimationFrame(() => {
      const newPos = start + text.length + cursorOffset;
      el.setSelectionRange(newPos, newPos);
      el.focus();
    });
  }

  return (
    <section className="max-w-2xl w-full mx-auto space-y-4">
      <div className="text-center space-y-3">
        <h2 className="text-[52px] font-bold font-sans tracking-tight leading-[1.1] text-on-surface">
          Ada's{' '}
          <span className="text-primary">Computer</span>
        </h2>
        <p className="text-[15px] font-sans text-on-surface-variant leading-relaxed">
          Enter symbolic expressions, natural language queries, or data streams.
        </p>
      </div>

      {/* Inline math keyboard — shown above the input when open */}
      {calcOpen && (
        <Calculator
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onInsert={insertAtCursor}
          onAction={handleAction}
          angleMode={angleMode}
          setAngleMode={setAngleMode}
        />
      )}

      {/* Error message */}
      {error && (
        <div className="glass-panel p-3 rounded-xl border-2 border-red-500/50 bg-red-500/10">
          <p className="text-sm font-mono text-red-400 text-center">
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* Input bar */}
      <div className="glass-panel p-1 rounded-xl transition-all duration-300">
        <div className="flex items-center gap-4 px-6 py-4 bg-surface-container-low rounded-lg">
          <button
            onClick={() => setCalcOpen((v) => !v)}
            className={`shrink-0 transition-opacity cursor-pointer ${
              calcOpen ? 'opacity-100' : 'opacity-50 hover:opacity-100'
            }`}
            title="Toggle Math Keyboard"
          >
            <img src={calcIcon} alt="calculator" className="w-6 h-6 object-contain" />
          </button>
          <input
            ref={inputRef}
            className="bg-transparent border-none outline-none focus:ring-0 w-full font-mono text-[18px] text-primary placeholder:text-outline-variant"
            placeholder="integrate log(x)^2 from 0 to 1..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void compute();
              }
            }}
          />
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => void compute()} className="bg-primary p-2 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <img src={arrowIcon} alt="submit" className="w-5 h-5 object-contain brightness-0" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
