import { useEffect, useRef, useState } from 'react';
import calcIcon from '../../assets/icon-calculator.svg';
import arrowIcon from '../../assets/icon-arrow.svg';
import Calculator from '../Calculator';
import MathExpressionField from '../MathExpressionField';
import { evaluate, formatResult, preloadSymbolicMath } from '../../utils/mathEvaluator';
import {
  serializeNodeArray,
  createInitialNode,
  insertTemplateAtTextNode,
  deleteTemplateAtTextNodeStart,
  getFlatTextNodes,
  findParentArrayAndIndex,
  findParentTemplateOfArray,
  generateId,
} from '../../utils/mathTree';

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

export default function IntelligenceHub() {
  const [query, setQuery] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [angleMode, setAngleMode] = useState('rad'); // 'rad', 'deg', 'grad'
  const [error, setError] = useState('');

  // Tree state replacing flat templates
  const [templateFields, setTemplateFields] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeCaret, setActiveCaret] = useState(null);

  const inputRef = useRef(null);
  const isTemplateActive = Boolean(templateFields);

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
      setTemplateFields(null);
      setActiveNodeId(null);
      setActiveCaret(null);
      setQuery(formatResult(result.result));
      setError('');
      inputRef.current?.focus();
      return;
    }

    showError(result.error);
    inputRef.current?.focus();
  }

  async function compute() {
    if (templateFields) {
      const expression = serializeNodeArray(templateFields);
      setQuery(expression);
      applyResult(await evaluate(expression, angleMode));
      return;
    }

    if (!query.trim()) return;
    applyResult(await evaluate(query, angleMode));
  }

  function startTemplate(type) {
    if (templateFields) {
      if (activeNodeId) {
        const caret = activeCaret ?? 0;
        const res = insertTemplateAtTextNode(templateFields, activeNodeId, caret, type);
        if (res) {
          setTemplateFields(res.updatedNodes);
          setActiveNodeId(res.focusNodeId);
          setActiveCaret(0);
          setQuery(serializeNodeArray(res.updatedNodes));
        }
      }
      return;
    }

    const initialNode = createInitialNode(type);
    const initialTree = [
      { type: 'text', value: '', id: generateId() },
      initialNode,
      { type: 'text', value: '', id: generateId() },
    ];
    setTemplateFields(initialTree);

    let focusNodeId;
    if (type === 'fraction') {
      focusNodeId = initialNode.numerator[0].id;
    } else {
      focusNodeId = initialNode.upper[0].id;
    }
    setActiveNodeId(focusNodeId);
    setActiveCaret(0);
    setQuery(serializeNodeArray(initialTree));
  }

  function clearTemplate() {
    setTemplateFields(null);
    setActiveNodeId(null);
    setActiveCaret(null);
    setQuery('');
    inputRef.current?.focus();
  }

  function clearAll() {
    setQuery('');
    setError('');
    setTemplateFields(null);
    setActiveNodeId(null);
    setActiveCaret(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleFocusNode(nodeId, caret) {
    setActiveNodeId(nodeId);
    setActiveCaret(caret);
  }

  function handleNavigateLeft(nodeId) {
    const flatTextNodes = getFlatTextNodes(templateFields);
    const idx = flatTextNodes.findIndex((n) => n.id === nodeId);
    if (idx > 0) {
      const prevNode = flatTextNodes[idx - 1];
      setActiveNodeId(prevNode.id);
      setActiveCaret(prevNode.value.length);
    }
  }

  function handleNavigateRight(nodeId) {
    const flatTextNodes = getFlatTextNodes(templateFields);
    const idx = flatTextNodes.findIndex((n) => n.id === nodeId);
    if (idx !== -1 && idx < flatTextNodes.length - 1) {
      const nextNode = flatTextNodes[idx + 1];
      setActiveNodeId(nextNode.id);
      setActiveCaret(0);
    }
  }

  function handleNavigateUp(nodeId, caret) {
    const parentTemplateRes = findParentTemplateOfArray(templateFields, nodeId);
    if (!parentTemplateRes) return;
    const { parentTemplate, fieldName } = parentTemplateRes;

    let targetField = null;
    if (parentTemplate.type === 'fraction') {
      if (fieldName === 'denominator') targetField = 'numerator';
    } else if (parentTemplate.type === 'sigma' || parentTemplate.type === 'product') {
      if (fieldName === 'lower' || fieldName === 'index' || fieldName === 'expr') {
        targetField = 'upper';
      }
    }

    if (targetField) {
      const targetNodes = parentTemplate[targetField];
      const firstTextNode = targetNodes.find((n) => n.type === 'text');
      if (firstTextNode) {
        setActiveNodeId(firstTextNode.id);
        setActiveCaret(Math.min(caret, firstTextNode.value.length));
      }
    }
  }

  function handleNavigateDown(nodeId, caret) {
    const parentTemplateRes = findParentTemplateOfArray(templateFields, nodeId);
    if (!parentTemplateRes) return;
    const { parentTemplate, fieldName } = parentTemplateRes;

    let targetField = null;
    if (parentTemplate.type === 'fraction') {
      if (fieldName === 'numerator') targetField = 'denominator';
    } else if (parentTemplate.type === 'sigma' || parentTemplate.type === 'product') {
      if (fieldName === 'upper') {
        targetField = 'lower';
      }
    }

    if (targetField) {
      const targetNodes = parentTemplate[targetField];
      const firstTextNode = targetNodes.find((n) => n.type === 'text');
      if (firstTextNode) {
        setActiveNodeId(firstTextNode.id);
        setActiveCaret(Math.min(caret, firstTextNode.value.length));
      }
    }
  }

  function handleBackspaceAtStart(nodeId) {
    const result = deleteTemplateAtTextNodeStart(templateFields, nodeId);
    if (result) {
      const flatText = serializeNodeArray(result.updatedNodes);
      if (flatText === '' && result.updatedNodes.length === 1 && result.updatedNodes[0].value === '') {
        clearTemplate();
      } else {
        setTemplateFields(result.updatedNodes);
        setActiveNodeId(result.focusNodeId);
        setActiveCaret(result.focusCaret);
        setQuery(flatText);
      }
    }
  }

  function handleStartFractionInline(nodeId, caret) {
    const result = insertTemplateAtTextNode(templateFields, nodeId, caret, 'fraction');
    if (result) {
      setTemplateFields(result.updatedNodes);
      setActiveNodeId(result.focusNodeId);
      setActiveCaret(0);
      setQuery(serializeNodeArray(result.updatedNodes));
    }
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

    if (templateFields && activeNodeId) {
      const res = findParentArrayAndIndex(templateFields, activeNodeId);
      if (res) {
        const { parentArray, index } = res;
        const textNode = parentArray[index];
        const preparedText = formatEditorNotation(text);

        const caret = activeCaret ?? 0;
        const left = textNode.value.slice(0, caret);
        const right = textNode.value.slice(caret);
        const nextValue = left + preparedText + right;

        const newTree = JSON.parse(JSON.stringify(templateFields));
        const cloneRes = findParentArrayAndIndex(newTree, activeNodeId);
        cloneRes.parentArray[cloneRes.index].value = nextValue;

        setTemplateFields(newTree);
        setQuery(serializeNodeArray(newTree));
        setActiveCaret(caret + preparedText.length + cursorOffset);
      }
      return;
    }

    const el = inputRef.current;
    if (!el) {
      setQuery((v) => formatEditorNotation(v + text));
      return;
    }

    const preparedText = formatEditorNotation(text);
    const start = el.selectionStart;
    const end = el.selectionEnd;
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
          <p className="text-sm font-mono text-red-400 text-center">⚠️ {error}</p>
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
            <div className="flex-1 flex items-center justify-between gap-3">
              <MathExpressionField
                nodes={templateFields}
                onChange={(updated) => {
                  setTemplateFields(updated);
                  setQuery(serializeNodeArray(updated));
                }}
                activeNodeId={activeNodeId}
                activeCaret={activeCaret}
                onFocusNode={handleFocusNode}
                onNavigateLeft={handleNavigateLeft}
                onNavigateRight={handleNavigateRight}
                onNavigateUp={handleNavigateUp}
                onNavigateDown={handleNavigateDown}
                onBackspaceAtStart={handleBackspaceAtStart}
                onSubmit={compute}
                onStartFraction={handleStartFractionInline}
                isRoot={true}
              />
              <button
                onClick={clearTemplate}
                className="h-8 px-2 rounded-md border border-outline/40 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors"
                title="Close template"
              >
                ×
              </button>
            </div>
          )}

          <textarea
            ref={inputRef}
            className={`bg-transparent border-none outline-none focus:ring-0 w-full min-h-[84px] resize-none font-mono text-[18px] leading-relaxed text-primary placeholder:text-outline-variant transition-opacity ${
              isTemplateActive ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'
            }`}
            placeholder={isTemplateActive ? '' : 'integrate log(x)^2 from 0 to 1...'}
            value={isTemplateActive ? '' : query}
            onChange={(e) => {
              setTemplateFields(null);
              setQuery(formatEditorNotation(e.target.value));
            }}
            onKeyDown={(e) => {
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
            <button
              onClick={() => void compute()}
              className="bg-primary p-2 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <img src={arrowIcon} alt="submit" className="w-5 h-5 object-contain brightness-0" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
