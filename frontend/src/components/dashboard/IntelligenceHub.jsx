import { useEffect, useRef, useState } from 'react';
import calcIcon from '../../assets/icon-calculator.svg';
import arrowIcon from '../../assets/icon-arrow.svg';
import Calculator from '../Calculator';
import MathExpressionField from '../MathExpressionField';
import { evaluate, formatResult, preloadSymbolicMath } from '../../utils/mathEvaluator';
import {
  generateId,
  serializeNodeArray,
  createInitialNode,
  insertTemplateAtTextNode,
  deleteTemplateAtTextNodeStart,
  getFlatTextNodes,
  findParentArrayAndIndex,
  findParentTemplateOfArray,
} from '../../utils/mathTree';

const SUPER_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '/': 'ᐟ', '(': '⁽', ')': '⁾',
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

function splitTopLevelFraction(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  let depth = 0;
  let slashIndex = -1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === '/' && depth === 0) {
      if (slashIndex !== -1) return null;
      slashIndex = i;
    }
  }

  if (slashIndex === -1) return null;
  const numerator = text.slice(0, slashIndex).trim();
  const denominator = text.slice(slashIndex + 1).trim();
  if (!numerator || !denominator) return null;

  return { numerator, denominator };
}

function unwrapOuterParens(value) {
  const text = String(value || '').trim();
  if (!text.startsWith('(') || !text.endsWith(')')) return text;

  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;

    if (depth === 0 && i < text.length - 1) {
      return text;
    }
  }

  return text.slice(1, -1).trim();
}

function splitTopLevelMultiplication(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === '*' && depth === 0) {
      const left = text.slice(0, i).trim();
      const right = text.slice(i + 1).trim();
      if (!left || !right) return null;
      return { left, right };
    }
  }

  return null;
}

function combineFactors(left, right) {
  const a = String(left || '').trim();
  const b = String(right || '').trim();
  if (!a) return b;
  if (!b) return a;
  if (a === '1') return b;
  if (b === '1') return a;
  return `${a}*${b}`;
}

function getFractionParts(value) {
  const direct = splitTopLevelFraction(value);
  if (direct) return direct;

  const product = splitTopLevelMultiplication(value);
  if (!product) return null;

  const leftFraction = splitTopLevelFraction(unwrapOuterParens(product.left));
  if (leftFraction) {
    return {
      numerator: combineFactors(leftFraction.numerator, product.right),
      denominator: leftFraction.denominator,
    };
  }

  const rightFraction = splitTopLevelFraction(unwrapOuterParens(product.right));
  if (rightFraction) {
    return {
      numerator: combineFactors(product.left, rightFraction.numerator),
      denominator: rightFraction.denominator,
    };
  }

  return null;
}

function createFractionResultTree(value) {
  const parts = getFractionParts(value);
  if (!parts) return null;

  const numeratorValue = formatEditorNotation(parts.numerator);
  const denominatorValue = formatEditorNotation(parts.denominator);

  return [
    {
      type: 'fraction',
      id: generateId(),
      numerator: [{ type: 'text', value: numeratorValue, id: generateId() }],
      denominator: [{ type: 'text', value: denominatorValue, id: generateId() }],
    },
  ];
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

  function autoResizeInput() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, 56), 260);
    el.style.height = `${nextHeight}px`;
  }

  useEffect(() => {
    if (calcOpen) {
      preloadSymbolicMath().catch(() => {
        // Ignore preload failures here; evaluation will surface any real error.
      });
    }
  }, [calcOpen]);

  useEffect(() => {
    if (!isTemplateActive) {
      autoResizeInput();
    }
  }, [query, isTemplateActive]);

  function showError(message) {
    setError(message);
    setTimeout(() => setError(''), 3000);
  }

  function applyResult(result) {
    if (result.success) {
      const formattedResult = formatResult(result.result);
      const fractionTree = createFractionResultTree(formattedResult);

      if (fractionTree) {
        setTemplateFields(fractionTree);
      } else {
        setTemplateFields(null);
      }

      setActiveNodeId(null);
      setActiveCaret(null);
      setQuery(formattedResult);
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

  function getTemplateFocusNodeId(node) {
    if (node.type === 'fraction') return node.numerator[0].id;
    if (node.type === 'power') return node.base[0].id;
    if (node.type === 'absolute') return node.arg[0].id;
    if (node.type === 'floor' || node.type === 'ceiling') return node.arg[0].id;
    if (node.type === 'mode') return node.left[0].id;
    if (node.type === 'nthRoot' || node.type === 'logBase') return node.value[0].id;
    if (node.type === 'sigma' || node.type === 'product') return node.upper[0].id;
    if (node.type === 'integral' || node.type === 'derivative') return node.expr[0].id;
    if (node.type === 'derivativeN' || node.type === 'partial' || node.type === 'partialN') return node.expr[0].id;
    if (node.type === 'trigFunction') return node.arg[0].id;
    if (node.type === 'matrix') return node.rows?.[0]?.[0]?.[0]?.id ?? null;
    if (node.type === 'matrixOp') return getTemplateFocusNodeId(node.arg[0]);
    if (node.type === 'matrixOp2') return getTemplateFocusNodeId(node.a[0]);
    return null;
  }

  function startTemplate(templateSpec) {
    if (templateFields) {
      if (activeNodeId) {
        const caret = activeCaret ?? 0;
        const res = insertTemplateAtTextNode(templateFields, activeNodeId, caret, templateSpec);
        if (res) {
          setTemplateFields(res.updatedNodes);
          setActiveNodeId(res.focusNodeId);
          setActiveCaret(0);
          setQuery(serializeNodeArray(res.updatedNodes));
        }
      }
      return;
    }

    const initialNode = createInitialNode(templateSpec);
    const initialTree = [initialNode];
    setTemplateFields(initialTree);

    const focusNodeId = getTemplateFocusNodeId(initialNode);
    setActiveNodeId(focusNodeId);
    setActiveCaret(0);
    setQuery(serializeNodeArray(initialTree));
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
      return;
    }

    if (idx === 0 && findParentTemplateOfArray(templateFields, nodeId)) {
      const firstRootNode = templateFields[0];
      if (firstRootNode?.type === 'text') {
        setActiveNodeId(firstRootNode.id);
        setActiveCaret(firstRootNode.value.length);
        return;
      }

      const newRootText = { type: 'text', value: '', id: generateId() };
      const newTree = [newRootText, ...templateFields];
      setTemplateFields(newTree);
      setActiveNodeId(newRootText.id);
      setActiveCaret(0);
      setQuery(serializeNodeArray(newTree));
    }
  }

  function handleNavigateRight(nodeId) {
    const flatTextNodes = getFlatTextNodes(templateFields);
    const idx = flatTextNodes.findIndex((n) => n.id === nodeId);
    if (idx !== -1 && idx < flatTextNodes.length - 1) {
      const nextNode = flatTextNodes[idx + 1];
      setActiveNodeId(nextNode.id);
      setActiveCaret(0);
      return;
    }

    if (idx === flatTextNodes.length - 1 && findParentTemplateOfArray(templateFields, nodeId)) {
      const lastRootNode = templateFields[templateFields.length - 1];
      if (lastRootNode?.type === 'text') {
        setActiveNodeId(lastRootNode.id);
        setActiveCaret(0);
        return;
      }

      const newRootText = { type: 'text', value: '', id: generateId() };
      const newTree = [...templateFields, newRootText];
      setTemplateFields(newTree);
      setActiveNodeId(newRootText.id);
      setActiveCaret(0);
      setQuery(serializeNodeArray(newTree));
    }
  }

  function handleNavigateUp(nodeId, caret) {
    const parentTemplateRes = findParentTemplateOfArray(templateFields, nodeId);
    if (!parentTemplateRes) return;
    const { parentTemplate, fieldName } = parentTemplateRes;

    let targetField = null;
    if (parentTemplate.type === 'fraction') {
      if (fieldName === 'denominator') targetField = 'numerator';
    } else if (parentTemplate.type === 'integral') {
      if (fieldName === 'lower' || fieldName === 'expr' || fieldName === 'variable') {
        targetField = 'upper';
      }
    } else if (parentTemplate.type === 'sigma' || parentTemplate.type === 'product') {
      if (fieldName === 'lower' || fieldName === 'index' || fieldName === 'expr') {
        targetField = 'upper';
      }
    } else if (parentTemplate.type === 'matrix' && fieldName.startsWith('cell:')) {
      const [, rowText, colText] = fieldName.split(':');
      const rowIndex = Number.parseInt(rowText, 10);
      const colIndex = Number.parseInt(colText, 10);
      if (!Number.isNaN(rowIndex) && !Number.isNaN(colIndex) && rowIndex > 0) {
        const targetCell = parentTemplate.rows[rowIndex - 1][colIndex];
        const firstTextNode = targetCell?.find((n) => n.type === 'text');
        if (firstTextNode) {
          setActiveNodeId(firstTextNode.id);
          setActiveCaret(Math.min(caret, firstTextNode.value.length));
        }
      }
      return;
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
    } else if (parentTemplate.type === 'integral') {
      if (fieldName === 'upper') {
        targetField = 'lower';
      } else if (fieldName === 'lower') {
        targetField = 'expr';
      }
    } else if (parentTemplate.type === 'sigma' || parentTemplate.type === 'product') {
      if (fieldName === 'upper') {
        targetField = 'lower';
      }
    } else if (parentTemplate.type === 'matrix' && fieldName.startsWith('cell:')) {
      const [, rowText, colText] = fieldName.split(':');
      const rowIndex = Number.parseInt(rowText, 10);
      const colIndex = Number.parseInt(colText, 10);
      if (!Number.isNaN(rowIndex) && !Number.isNaN(colIndex) && rowIndex < parentTemplate.rows.length - 1) {
        const targetCell = parentTemplate.rows[rowIndex + 1][colIndex];
        const firstTextNode = targetCell?.find((n) => n.type === 'text');
        if (firstTextNode) {
          setActiveNodeId(firstTextNode.id);
          setActiveCaret(Math.min(caret, firstTextNode.value.length));
        }
      }
      return;
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
        clearAll();
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

  function handleStartPowerInline(nodeId, caret) {
    const parentRes = findParentArrayAndIndex(templateFields, nodeId);
    if (parentRes && caret === 0 && parentRes.index > 0) {
      const newTree = JSON.parse(JSON.stringify(templateFields));
      const cloneRes = findParentArrayAndIndex(newTree, nodeId);
      const parentArray = cloneRes.parentArray;
      const index = cloneRes.index;
      const prevNode = parentArray[index - 1];
      const currentNode = parentArray[index];

      const powerNode = createInitialNode({ type: 'power', exponent: '' });
      if (prevNode.type === 'text') {
        powerNode.base = [{ type: 'text', value: prevNode.value, id: generateId() }];
      } else {
        powerNode.base = [prevNode];
      }

      const replacement = [powerNode];
      if (currentNode.type === 'text' && currentNode.value.length > 0) {
        replacement.push(currentNode);
      }

      parentArray.splice(index - 1, 2, ...replacement);
      setTemplateFields(newTree);
      setActiveNodeId(powerNode.exponent[0].id);
      setActiveCaret(0);
      setQuery(serializeNodeArray(newTree));
      return;
    }

    const result = insertTemplateAtTextNode(templateFields, nodeId, caret, { type: 'power', exponent: '' });
    if (result) {
      setTemplateFields(result.updatedNodes);
      setActiveNodeId(result.focusNodeId);
      setActiveCaret(0);
      setQuery(serializeNodeArray(result.updatedNodes));
    }
  }

  function insertAtCursor(text, cursorOffset = 0) {
    if (text.startsWith('__MATRIX_TEMPLATE__')) {
      const [, size = '2x2'] = text.split(':');
      const [rowsText, colsText] = size.toLowerCase().split('x');
      const rows = Number.parseInt(rowsText, 10) || 2;
      const cols = Number.parseInt(colsText, 10) || 2;
      startTemplate({ type: 'matrix', rows, cols });
      return;
    }

    if (text === '__MATRIX_DET_TEMPLATE__') {
      startTemplate({ type: 'matrixOp', op: 'det' });
      return;
    }

    if (text === '__MATRIX_TRANSPOSE_TEMPLATE__') {
      startTemplate({ type: 'matrixOp', op: 'transpose' });
      return;
    }

    if (text === '__MATRIX_INVERT_TEMPLATE__') {
      startTemplate({ type: 'matrixOp', op: 'invert' });
      return;
    }

    if (text === '__MATRIX_RANK_TEMPLATE__') {
      startTemplate({ type: 'matrixOp', op: 'rank' });
      return;
    }

    if (text === '__MATRIX_TRACE_TEMPLATE__') {
      startTemplate({ type: 'matrixOp', op: 'trace' });
      return;
    }

    if (text === '__MATRIX_DOT_TEMPLATE__') {
      startTemplate({ type: 'matrixOp2', op: 'dot', vector: true, aRows: 1, aCols: 3, bRows: 1, bCols: 3 });
      return;
    }

    if (text === '__MATRIX_CROSS_TEMPLATE__') {
      startTemplate({ type: 'matrixOp2', op: 'cross', vector: true, aRows: 1, aCols: 3, bRows: 1, bCols: 3 });
      return;
    }

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

    if (text.startsWith('__POWER_TEMPLATE__')) {
      const [, exponent = ''] = text.split(':');
      startTemplate({ type: 'power', exponent });
      return;
    }

    if (text === '__ABS_TEMPLATE__') {
      startTemplate('absolute');
      return;
    }

    if (text === '__EXP_TEMPLATE__') {
      startTemplate({ type: 'power', base: 'e', exponent: 'x' });
      return;
    }

    if (text === '__INTEGRAL_TEMPLATE__') {
      startTemplate('integral');
      return;
    }

    if (text === '__DERIVATIVE_TEMPLATE__') {
      startTemplate('derivative');
      return;
    }

    if (text === '__DERIVATIVE_N_TEMPLATE__') {
      startTemplate('derivativeN');
      return;
    }

    if (text === '__PARTIAL_TEMPLATE__') {
      startTemplate('partial');
      return;
    }

    if (text === '__PARTIAL_N_TEMPLATE__') {
      startTemplate('partialN');
      return;
    }

    if (text === '__FLOOR_TEMPLATE__') {
      startTemplate('floor');
      return;
    }

    if (text === '__CEILING_TEMPLATE__') {
      startTemplate('ceiling');
      return;
    }

    if (text === '__MODE_TEMPLATE__') {
      startTemplate('mode');
      return;
    }

    if (text.startsWith('__NTHROOT_TEMPLATE__')) {
      const [, degree = 'n'] = text.split(':');
      startTemplate({ type: 'nthRoot', degree });
      return;
    }

    if (text === '__LOG_BASE_TEMPLATE__') {
      startTemplate('logBase');
      return;
    }

    if (text.startsWith('__FUNC_TEMPLATE__:')) {
      const func = text.slice('__FUNC_TEMPLATE__:'.length) || 'sin';
      startTemplate({ type: 'trigFunction', func });
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
          Analytical{' '}
          <span className="text-primary">Engine</span>
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
            <div className="flex-1 flex items-center gap-3">
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
                onStartPower={handleStartPowerInline}
                isRoot={true}
              />
            </div>
          )}

          {!isTemplateActive && (
            <textarea
              ref={inputRef}
              className="bg-transparent border-none outline-none focus:ring-0 w-full min-h-[56px] resize-none font-mono text-[18px] leading-relaxed text-primary placeholder:text-outline-variant"
              style={{ overflow: 'hidden' }}
              placeholder="integrate log(x)^2 from 0 to 1..."
              value={query}
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

                if (e.key === '^' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault();
                  startTemplate({ type: 'power', exponent: '' });
                  return;
                }

                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void compute();
                }
              }}
            />
          )}
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
