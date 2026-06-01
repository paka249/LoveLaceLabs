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

  if (template.type === 'fraction') {
    return `(${template.numerator})/(${template.denominator})`;
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
  const templateLowerRef = useRef(null);
  const templateExprRef = useRef(null);
  const templateIndexRef = useRef(null);
  const templateBoundRef = useRef(null);
  const isTemplateActive = Boolean(templateFields);

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
      setTemplateFields(null);
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
    const initial = type === 'fraction'
      ? {
        type,
        numerator: '',
        denominator: '',
      }
      : {
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

    if (text === '__FRACTION_TEMPLATE__') {
      startTemplate('fraction');
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

          {templateFields?.type === 'fraction' && (
            <div className="shrink-0 flex items-center rounded-md px-1 py-1">
              <div className="w-[132px]">
                <input
                  ref={templateUpperRef}
                  value={templateFields.numerator}
                  onChange={(e) => updateTemplateField('numerator', e.target.value)}
                  onKeyDown={(e) => {
                    const caret = e.currentTarget.selectionStart ?? 0;
                    const length = e.currentTarget.value.length;

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextPos = Math.min(caret, templateFields.denominator.length);
                      templateLowerRef.current?.focus();
                      templateLowerRef.current?.setSelectionRange(nextPos, nextPos);
                      return;
                    }

                    if (e.key === 'ArrowRight' && caret === length) {
                      e.preventDefault();
                      templateLowerRef.current?.focus();
                      templateLowerRef.current?.setSelectionRange(0, 0);
                      return;
                    }

                    if (e.key === 'ArrowLeft' && caret === 0) {
                      e.preventDefault();
                      inputRef.current?.focus();
                      return;
                    }

                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void compute();
                    }
                  }}
                  className="h-9 w-full px-2 rounded-md border-2 border-primary/60 bg-surface-container-low/40 text-center text-[20px] font-mono text-primary"
                  placeholder="num"
                />
                <div className="h-[2px] w-full bg-primary/85 rounded-full my-1" />
                <input
                  ref={templateLowerRef}
                  value={templateFields.denominator}
                  onChange={(e) => updateTemplateField('denominator', e.target.value)}
                  onKeyDown={(e) => {
                    const caret = e.currentTarget.selectionStart ?? 0;
                    const length = e.currentTarget.value.length;

                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const nextPos = Math.min(caret, templateFields.numerator.length);
                      templateUpperRef.current?.focus();
                      templateUpperRef.current?.setSelectionRange(nextPos, nextPos);
                      return;
                    }

                    if (e.key === 'ArrowLeft' && caret === 0) {
                      e.preventDefault();
                      templateUpperRef.current?.focus();
                      templateUpperRef.current?.setSelectionRange(templateFields.numerator.length, templateFields.numerator.length);
                      return;
                    }

                    if (e.key === 'ArrowRight' && caret === length) {
                      e.preventDefault();
                      inputRef.current?.focus();
                      return;
                    }

                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void compute();
                    }
                  }}
                  className="h-9 w-full px-2 rounded-md border-2 border-primary/60 bg-surface-container-low/40 text-center text-[20px] font-mono text-primary"
                  placeholder="den"
                />
              </div>
            </div>
          )}

          {templateFields && templateFields.type !== 'fraction' && (
            <div className="shrink-0 flex items-center rounded-md px-1 py-1">
                <div className="grid grid-cols-[68px_160px] grid-rows-3 gap-x-3 gap-y-1 items-center">
                <input
                  ref={templateUpperRef}
                  value={templateFields.upper}
                  onChange={(e) => updateTemplateField('upper', e.target.value)}
                  onKeyDown={(e) => {
                    const caret = e.currentTarget.selectionStart ?? 0;
                    const length = e.currentTarget.value.length;

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextPos = Math.min(caret, templateFields.lower.length);
                      templateBoundRef.current?.focus();
                      templateBoundRef.current?.setSelectionRange(nextPos, nextPos);
                      return;
                    }

                    if (e.key === 'ArrowRight' && caret === length) {
                      e.preventDefault();
                      templateExprRef.current?.focus();
                      templateExprRef.current?.setSelectionRange(0, 0);
                      return;
                    }

                    if (e.key === 'ArrowLeft' && caret === 0) {
                      e.preventDefault();
                      inputRef.current?.focus();
                      return;
                    }

                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void compute();
                    }
                  }}
                  className="h-8 px-2 rounded-md border-2 border-primary/60 bg-surface-container-low/40 text-center text-[16px] font-mono text-primary"
                  placeholder="n"
                />
                <div />

                <div className="text-[38px] leading-none text-primary text-center">
                  {templateFields.type === 'sigma' ? 'Σ' : 'Π'}
                </div>
                <input
                  ref={templateExprRef}
                  value={templateFields.expr}
                  onChange={(e) => updateTemplateField('expr', e.target.value)}
                  onKeyDown={(e) => {
                    const caret = e.currentTarget.selectionStart ?? 0;
                    const length = e.currentTarget.value.length;

                    if (e.key === 'ArrowLeft' && caret === 0) {
                      e.preventDefault();
                      templateUpperRef.current?.focus();
                      const pos = templateFields.upper.length;
                      templateUpperRef.current?.setSelectionRange(pos, pos);
                      return;
                    }

                    if (e.key === 'ArrowRight' && caret === length) {
                      e.preventDefault();
                      templateIndexRef.current?.focus();
                      templateIndexRef.current?.setSelectionRange(0, 0);
                      return;
                    }

                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const nextPos = Math.min(caret, templateFields.upper.length);
                      templateUpperRef.current?.focus();
                      templateUpperRef.current?.setSelectionRange(nextPos, nextPos);
                      return;
                    }

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextPos = Math.min(caret, templateFields.lower.length);
                      templateBoundRef.current?.focus();
                      templateBoundRef.current?.setSelectionRange(nextPos, nextPos);
                      return;
                    }

                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void compute();
                    }
                  }}
                  className="h-9 px-2 rounded-md border-2 border-primary/60 bg-surface-container-low/40 text-[16px] font-mono text-primary"
                  placeholder="expression"
                />

                <div className="inline-flex items-center gap-2 justify-center">
                  <input
                    ref={templateIndexRef}
                    value={templateFields.index}
                    onChange={(e) => updateTemplateField('index', e.target.value)}
                    onKeyDown={(e) => {
                      const caret = e.currentTarget.selectionStart ?? 0;
                      const length = e.currentTarget.value.length;

                      if (e.key === 'ArrowLeft' && caret === 0) {
                        e.preventDefault();
                        templateExprRef.current?.focus();
                        const pos = templateFields.expr.length;
                        templateExprRef.current?.setSelectionRange(pos, pos);
                        return;
                      }

                      if (e.key === 'ArrowRight' && caret === length) {
                        e.preventDefault();
                        templateBoundRef.current?.focus();
                        templateBoundRef.current?.setSelectionRange(0, 0);
                        return;
                      }

                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const nextPos = Math.min(caret, templateFields.upper.length);
                        templateUpperRef.current?.focus();
                        templateUpperRef.current?.setSelectionRange(nextPos, nextPos);
                        return;
                      }

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextPos = Math.min(caret, templateFields.lower.length);
                        templateBoundRef.current?.focus();
                        templateBoundRef.current?.setSelectionRange(nextPos, nextPos);
                        return;
                      }

                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void compute();
                      }
                    }}
                    className="h-8 w-11 px-1 rounded-md border-2 border-primary/60 bg-surface-container-low/40 text-center text-[16px] font-mono text-primary"
                    placeholder="i"
                  />
                  <span className="text-[18px] text-primary">=</span>
                </div>
                <div className="inline-flex items-center gap-2 justify-start">
                  <input
                    ref={templateBoundRef}
                    value={templateFields.lower}
                    onChange={(e) => updateTemplateField('lower', e.target.value)}
                    onKeyDown={(e) => {
                      const caret = e.currentTarget.selectionStart ?? 0;
                      const length = e.currentTarget.value.length;

                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const nextPos = Math.min(caret, templateFields.upper.length);
                        templateUpperRef.current?.focus();
                        templateUpperRef.current?.setSelectionRange(nextPos, nextPos);
                        return;
                      }

                      if (e.key === 'ArrowLeft' && caret === 0) {
                        e.preventDefault();
                        templateIndexRef.current?.focus();
                        const pos = templateFields.index.length;
                        templateIndexRef.current?.setSelectionRange(pos, pos);
                        return;
                      }

                      if (e.key === 'ArrowRight' && caret === length) {
                        e.preventDefault();
                        inputRef.current?.focus();
                        return;
                      }

                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void compute();
                      }
                    }}
                    className="h-8 w-16 px-2 rounded-md border-2 border-primary/60 bg-surface-container-low/40 text-center text-[16px] font-mono text-primary"
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
            placeholder={isTemplateActive ? '' : 'integrate log(x)^2 from 0 to 1...'}
            value={isTemplateActive ? '' : query}
            onChange={(e) => {
              setTemplateFields(null);
              setQuery(formatEditorNotation(e.target.value));
            }}
            onKeyDown={(e) => {
              if (templateFields?.type === 'fraction') {
                if (e.key === 'ArrowLeft' && (e.currentTarget.selectionStart ?? 0) === 0) {
                  e.preventDefault();
                  templateLowerRef.current?.focus();
                  const pos = templateFields.denominator.length;
                  templateLowerRef.current?.setSelectionRange(pos, pos);
                  return;
                }
              } else if (templateFields?.type === 'sigma' || templateFields?.type === 'product') {
                if (e.key === 'ArrowLeft' && (e.currentTarget.selectionStart ?? 0) === 0) {
                  e.preventDefault();
                  templateBoundRef.current?.focus();
                  const pos = templateFields.lower.length;
                  templateBoundRef.current?.setSelectionRange(pos, pos);
                  return;
                }
              }

              if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                startTemplate('fraction');
                return;
              }

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
