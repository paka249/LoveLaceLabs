import { useEffect, useRef, useState } from 'react';
import calcIcon from '../../assets/icon-calculator.svg';
import arrowIcon from '../../assets/icon-arrow.svg';
import Calculator from '../Calculator';
import { evaluate, formatResult, preloadSymbolicMath } from '../../utils/mathEvaluator';

const SUPER_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ',
  i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ',
  r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
};

const SUB_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ',
  m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', x: 'ₓ',
};

function formatEditorNotation(value) {
  let formatted = value.replace(/->/g, '→');

  formatted = formatted.replace(/\^\(([^)]*)\)/g, (_match, token) => {
    return [...token].map((char) => SUPER_MAP[char.toLowerCase()] ?? char).join('');
  });

  formatted = formatted.replace(/_\{([^}]*)\}/g, (_match, token) => {
    return [...token].map((char) => SUB_MAP[char.toLowerCase()] ?? char).join('');
  });

  formatted = formatted.replace(/\^\{([^}]*)\}|\^([A-Za-z0-9+\-=()])/g, (_match, braced, single) => {
    const token = braced ?? single ?? '';
    return [...token].map((char) => SUPER_MAP[char.toLowerCase()] ?? char).join('');
  });

  formatted = formatted.replace(/_\{([^}]*)\}|_([A-Za-z0-9+\-=()])/g, (_match, braced, single) => {
    const token = braced ?? single ?? '';
    return [...token].map((char) => SUB_MAP[char.toLowerCase()] ?? char).join('');
  });

  return formatted;
}

function buildTemplateExpression(template) {
  if (!template) {
    return '';
  }

  const { type, upper, expr, index, lower } = template;
  const symbol = type === 'sigma' ? 'Σ' : 'Π';
  return `${symbol}(${index}=${lower}→${upper})(${expr})`;
}

export default function IntelligenceHub() {
  const [query, setQuery] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [angleMode, setAngleMode] = useState('rad'); // 'rad', 'deg', 'grad'
  const [error, setError] = useState('');
  const [templateFields, setTemplateFields] = useState(null);
  const inputRef = useRef(null);
  const templateUpperRef = useRef(null);

  useEffect(() => {
    if (calcOpen) {
      preloadSymbolicMath().catch(() => {
        // Ignore preload failures here; evaluation will surface any real error.
      });
    }
  }, [calcOpen]);

  useEffect(() => {
    if (templateFields) {
      requestAnimationFrame(() => {
        templateUpperRef.current?.focus();
      });
    }
  }, [templateFields]);

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

  async function compute() {
    if (!query.trim()) return;

    applyResult(await evaluate(query, angleMode));
  }

  function startTemplate(type) {
    const initial = {
      type,
      upper: '',
      expr: '',
      index: 'i',
      lower: '1',
    };

    setTemplateFields(initial);
    setQuery(buildTemplateExpression(initial));
  }

  function updateTemplateField(field, value) {
    setTemplateFields((prev) => {
      if (!prev) {
        return prev;
      }

      const next = { ...prev, [field]: formatEditorNotation(value) };
      setQuery(buildTemplateExpression(next));
      return next;
    });
  }

  function clearTemplate() {
    setTemplateFields(null);
    inputRef.current?.focus();
  }

  function clearAll() {
    setQuery('');
    setError('');
    setTemplateFields(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function insertAtCursor(text, cursorOffset = 0) {
    if (text === '__SIGMA_TEMPLATE__') {
      startTemplate('sigma');
      return;
    }

    if (text === '__PRODUCT_TEMPLATE__') {
      startTemplate('product');
      return;
    }

    const el = inputRef.current;
    if (!el) {
      setQuery((v) => formatEditorNotation(v + text));
      return;
    }

    const preparedText = formatEditorNotation(text);
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const currentValue = el.value;
    const next = currentValue.slice(0, start) + preparedText + currentValue.slice(end);
    setQuery(next);
    requestAnimationFrame(() => {
      const newPos = start + preparedText.length + cursorOffset;
      const hasPlaceholderAtCursor = next[newPos] === '□';
      if (hasPlaceholderAtCursor) {
        el.setSelectionRange(newPos, newPos + 1);
      } else {
        el.setSelectionRange(newPos, newPos);
      }
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

          {templateFields && (
            <div className="w-full max-w-[430px] rounded-lg border border-primary/50 bg-surface/40 p-3">
              <div className="grid grid-cols-[72px_1fr] grid-rows-3 gap-x-3 gap-y-2 items-center">
                <input
                  ref={templateUpperRef}
                  value={templateFields.upper}
                  onChange={(e) => updateTemplateField('upper', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void compute();
                    }
                  }}
                  className="h-9 px-2 rounded-md border border-primary/60 bg-transparent text-center text-[18px] font-mono text-primary"
                  placeholder="n"
                />
                <div />

                <div className="text-[42px] leading-none text-primary text-center">
                  {templateFields.type === 'sigma' ? 'Σ' : 'Π'}
                </div>
                <input
                  value={templateFields.expr}
                  onChange={(e) => updateTemplateField('expr', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void compute();
                    }
                  }}
                  className="h-9 px-2 rounded-md border border-primary/60 bg-transparent text-[18px] font-mono text-primary"
                  placeholder="expression"
                />

                <div className="inline-flex items-center gap-2 justify-center">
                  <input
                    value={templateFields.index}
                    onChange={(e) => updateTemplateField('index', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void compute();
                      }
                    }}
                    className="h-9 w-12 px-2 rounded-md border border-primary/60 bg-transparent text-center text-[18px] font-mono text-primary"
                    placeholder="i"
                  />
                  <span className="text-[20px] text-primary">=</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <input
                    value={templateFields.lower}
                    onChange={(e) => updateTemplateField('lower', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void compute();
                      }
                    }}
                    className="h-9 w-20 px-2 rounded-md border border-primary/60 bg-transparent text-center text-[18px] font-mono text-primary"
                    placeholder="1"
                  />
                  <button
                    onClick={clearTemplate}
                    className="h-8 px-2 rounded-md border border-outline/40 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors"
                    title="Close template"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

          <textarea
            ref={inputRef}
            className="bg-transparent border-none outline-none focus:ring-0 w-full min-h-[84px] resize-none font-mono text-[18px] leading-relaxed text-primary placeholder:text-outline-variant"
            placeholder="integrate log(x)^2 from 0 to 1..."
            value={query}
            onChange={(e) => {
              setTemplateFields(null);
              setQuery(formatEditorNotation(e.target.value));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void compute();
              }
            }}
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={clearAll}
              className="px-3 py-2 rounded-lg border border-outline/30 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
              title="Clear input"
            >
              clear
            </button>
            <button onClick={() => void compute()} className="bg-primary p-2 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <img src={arrowIcon} alt="submit" className="w-5 h-5 object-contain brightness-0" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
