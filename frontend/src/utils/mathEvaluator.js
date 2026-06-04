/**
 * Mathematical expression evaluator
 * Handles parsing Unicode math notation and computing results
 */

let symbolicMathPromise;

const SYMBOLIC_IDENTIFIER_PATTERN = String.raw`[\p{L}_][\p{L}\p{N}_]*`;

const PROTECTED_SYMBOLIC_IDENTIFIERS = [
  'log10', 'sinh', 'cosh', 'tanh',
  'asin', 'acos', 'atan',
  'sqrt', 'root',
  'sum', 'product', 'limit', 'diff', 'integrate', 'defint',
  'mode', 'floor', 'ceil', 'log_b',
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'log', 'ln', 'pi', 'e',
];

export async function preloadSymbolicMath() {
  if (!symbolicMathPromise) {
    symbolicMathPromise = import('nerdamer').then(async (nerdamerModule) => {
      await Promise.all([
        import('nerdamer/Algebra.js'),
        import('nerdamer/Calculus.js'),
      ]);

      return nerdamerModule.default;
    });
  }

  return symbolicMathPromise;
}

function normalizeImplicitMultiplication(expr) {
  let normalized = expr;
  const placeholders = new Map();

  PROTECTED_SYMBOLIC_IDENTIFIERS.forEach((identifier, index) => {
    const token = `§${index}§`;
    const pattern = new RegExp(`\\b${identifier}\\b`, 'gi');
    normalized = normalized.replace(pattern, (match) => {
      placeholders.set(token, match);
      return token;
    });
  });

  normalized = normalized
    .replace(/(\d)([A-Za-zα-ωΑ-Ω(])/g, '$1*$2')
    .replace(/([A-Za-zα-ωΑ-Ω)])(\d)/g, '$1*$2')
    .replace(/([A-Za-zα-ωΑ-Ω])([A-Za-zα-ωΑ-Ω])/g, '$1*$2')
    .replace(/([A-Za-zα-ωΑ-Ω)])(\()/g, '$1*$2')
    .replace(/(\))([A-Za-zα-ωΑ-Ω])/g, '$1*$2')
    .replace(/(\))(\()/g, '$1*$2');

  placeholders.forEach((value, token) => {
    normalized = normalized.replaceAll(token, value);
  });

  return normalized;
}

function toNerdamerExpression(expr) {
  return normalizeImplicitMultiplication(expr
    .trim()
    .replace(/√([A-Za-zα-ωΑ-Ω_][A-Za-z0-9α-ωΑ-Ω_]*)/gu, 'sqrt($1)')
    .replace(/∛([A-Za-zα-ωΑ-Ω_][A-Za-z0-9α-ωΑ-Ω_]*)/gu, 'root($1,3)')
    .replace(/∜([A-Za-zα-ωΑ-Ω_][A-Za-z0-9α-ωΑ-Ω_]*)/gu, 'root($1,4)')
    .replace(/\bpi\b/gi, 'pi')
    .replace(/π/g, 'pi')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/±/g, '+')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√\(/g, 'sqrt(')
    .replace(/∛\(/g, 'root(')
    .replace(/∜\(/g, 'root(')
    .replace(/\bnthroot\(([^,]+),([^)]+)\)/g, '(($1)^(1/($2)))')
    .replace(/\broot\(([^,]+),([^)]+)\)/g, '(($1)^(1/($2)))')
    .replace(/log₁₀\(/g, 'log10(')
    .replace(/\blog_b\(([^,]+),([^)]+)\)/g, '(log($1)/log($2))')
    .replace(/\bmode\(([^,]+),([^)]+)\)/g, 'mod($1,$2)')
    .replace(/\bln\(/g, 'log(')
    .replace(/sin\^\(?-?1\)?\(/g, 'asin(')
    .replace(/cos\^\(?-?1\)?\(/g, 'acos(')
    .replace(/tan\^\(?-?1\)?\(/g, 'atan(')
    .replace(/sin⁻¹\(/g, 'asin(')
    .replace(/cos⁻¹\(/g, 'acos(')
    .replace(/tan⁻¹\(/g, 'atan('));
}

function toPrettyIndexNotation(expr) {
  return expr
    .replace(/sum\(([^,]+),k,1,n\)/g, 'Σⁿᵢ₌₁($1)')
    .replace(/product\(([^,]+),k,1,n\)/g, 'Πⁿᵢ₌₁($1)')
    .replace(/Σⁿᵢ₌₁\(([^)]*)\)/g, (_match, body) => `Σⁿᵢ₌₁(${body.replace(/\bk\b/g, 'i')})`)
    .replace(/Πⁿᵢ₌₁\(([^)]*)\)/g, (_match, body) => `Πⁿᵢ₌₁(${body.replace(/\bk\b/g, 'i')})`)
    .replace(/Σ\(i=1→n\)\(/g, 'Σⁿᵢ₌₁(')
    .replace(/Π\(i=1→n\)\(/g, 'Πⁿᵢ₌₁(')
    .replace(/lim\(x→a\)\(/g, 'limₓ→ₐ(')
    .replace(/lim\(x→([^)]+)\)\(/g, 'limₓ→$1(');
}

function fromNerdamerExpression(expr) {
  return toPrettyIndexNotation(expr.replace(/\bpi\b/g, 'π'));
}

function findTopLevelEqualsIndex(expr) {
  let depth = 0;

  for (let index = 0; index < expr.length; index += 1) {
    const char = expr[index];

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === '=' && depth === 0) {
      return index;
    }
  }

  return -1;
}

function normalizeSymbolicInput(expr) {
  const trimmed = expr.trim();
  const equalsIndex = findTopLevelEqualsIndex(trimmed);

  if (equalsIndex === -1) {
    return trimmed;
  }

  return trimmed.slice(equalsIndex + 1).trim();
}

function normalizePrettyIndexNotation(expr) {
  return expr
    .replace(/->/g, '→')
    .replace(/limₓ→ₐ\(/g, 'lim(x→a)(')
    .replace(/limₓ→([^\s(]+)\(/g, 'lim(x→$1)(')
    .replace(/Σⁿᵢ₌₁\(/g, 'Σ(i=1→n)(')
    .replace(/Πⁿᵢ₌₁\(/g, 'Π(i=1→n)(')
    .replace(/Σ([A-Za-z0-9]+)i=1\(/g, 'Σ(i=1→$1)(')
    .replace(/Π([A-Za-z0-9]+)i=1\(/g, 'Π(i=1→$1)(')
    .replace(/lim\s*x→a\s*\(/g, 'lim(x→a)(')
    .replace(/Σ\s*i=1→n\s*\(/g, 'Σ(i=1→n)(')
    .replace(/Π\s*i=1→n\s*\(/g, 'Π(i=1→n)(');
}

function normalizeVisualSumProductTemplates(expr) {
  return expr
    .replace(/([^\n]+)\nΣ\s*([^\n]+)\n([^\n=]+)=([^\n]+)/g, (_match, upper, body, indexVar, lower) => {
      const up = upper.trim();
      const b = body.trim();
      const i = indexVar.trim();
      const low = lower.trim();
      if (!up || !b || !i || !low || [up, b, i, low].some((token) => token.includes('□'))) {
        return _match;
      }
      return `Σ(${i}=${low}→${up})(${b})`;
    })
    .replace(/([^\n]+)\nΠ\s*([^\n]+)\n([^\n=]+)=([^\n]+)/g, (_match, upper, body, indexVar, lower) => {
      const up = upper.trim();
      const b = body.trim();
      const i = indexVar.trim();
      const low = lower.trim();
      if (!up || !b || !i || !low || [up, b, i, low].some((token) => token.includes('□'))) {
        return _match;
      }
      return `Π(${i}=${low}→${up})(${b})`;
    });
}

function normalizeLatexFractions(expr) {
  let normalized = expr;
  let previous;

  do {
    previous = normalized;
    normalized = normalized.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  } while (normalized !== previous);

  return normalized;
}

const SUPER_TO_NORMAL = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', 'ᐟ': '/', '⁽': '(', '⁾': ')',
  'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f', 'ᵍ': 'g', 'ʰ': 'h',
  'ⁱ': 'i', 'ʲ': 'j', 'ᵏ': 'k', 'ˡ': 'l', 'ᵐ': 'm', 'ⁿ': 'n', 'ᵒ': 'o', 'ᵖ': 'p',
  'ʳ': 'r', 'ˢ': 's', 'ᵗ': 't', 'ᵘ': 'u', 'ᵛ': 'v', 'ʷ': 'w', 'ˣ': 'x', 'ʸ': 'y', 'ᶻ': 'z',
};

const SUB_TO_NORMAL = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
  'ₐ': 'a', 'ₑ': 'e', 'ₕ': 'h', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₗ': 'l',
  'ₘ': 'm', 'ₙ': 'n', 'ₒ': 'o', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ₓ': 'x',
};

function isSuperscriptChar(char) {
  return Object.prototype.hasOwnProperty.call(SUPER_TO_NORMAL, char);
}

function isSubscriptChar(char) {
  return Object.prototype.hasOwnProperty.call(SUB_TO_NORMAL, char);
}

function normalizeUnicodeScripts(expr) {
  let normalized = '';
  let index = 0;

  while (index < expr.length) {
    const char = expr[index];

    if (isSuperscriptChar(char)) {
      let run = '';
      while (index < expr.length && isSuperscriptChar(expr[index])) {
        run += SUPER_TO_NORMAL[expr[index]];
        index += 1;
      }

      const previousChar = normalized.at(-1);
      if (previousChar === 'Σ' || previousChar === 'Π') {
        normalized += run;
      } else {
        normalized += run.length > 1 ? `^(${run})` : `^${run}`;
      }
      continue;
    }

    if (isSubscriptChar(char)) {
      let run = '';
      while (index < expr.length && isSubscriptChar(expr[index])) {
        run += SUB_TO_NORMAL[expr[index]];
        index += 1;
      }

      normalized += run;
      continue;
    }

    normalized += char;
    index += 1;
  }

  return normalized;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function remapIndexSymbol(expr, fromSymbol, toSymbol) {
  if (fromSymbol === toSymbol) {
    return expr;
  }

  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])(${escapeRegExp(fromSymbol)})(?=$|[^\\p{L}\\p{N}_])`,
    'gu',
  );
  return expr.replace(pattern, (_match, prefix) => `${prefix}${toSymbol}`);
}

function nextInternalIndexSymbol(state) {
  const symbols = ['v', 'w', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'a', 'b', 'c', 'd', 'f', 'g', 'h', 'o', 'y', 'z'];
  const symbol = symbols[state.counter];
  if (!symbol) {
    throw new Error('Nested symbolic operations exceed supported depth');
  }
  state.counter += 1;
  return symbol;
}

function remapBoundExpression(expr, fromSymbol, toSymbol) {
  const directlyRemapped = remapIndexSymbol(expr, fromSymbol, toSymbol);
  const normalizedMultiplication = normalizeImplicitMultiplication(directlyRemapped);
  return remapIndexSymbol(normalizedMultiplication, fromSymbol, toSymbol);
}

function findMatchingParenthesis(str, openPos) {
  let depth = 1;
  for (let i = openPos + 1; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function translateSymbolicToNerdamerInternal(expr, state) {
  let result = expr;
  let iterations = 0;
  while (iterations++ < 100) {
    let earliestMatch = null;
    let earliestIndex = Infinity;

    const ops = [
      { name: 'diff', regex: new RegExp(`d\\/d(${SYMBOLIC_IDENTIFIER_PATTERN})\\(`, 'gu') },
      { name: 'diffPart', regex: new RegExp(`∂\\/∂(${SYMBOLIC_IDENTIFIER_PATTERN})\\(`, 'gu') },
      { name: 'diffN', regex: new RegExp(`d\\^(\\d+)\\/d(${SYMBOLIC_IDENTIFIER_PATTERN})\\^\\1\\(`, 'gu') },
      { name: 'diffPartN', regex: new RegExp(`∂\\^(\\d+)\\/∂(${SYMBOLIC_IDENTIFIER_PATTERN})\\^\\1\\(`, 'gu') },
      { name: 'lim', regex: new RegExp(`lim\\((${SYMBOLIC_IDENTIFIER_PATTERN})→([^)]+)\\)\\(`, 'gu') },
      { name: 'sum', regex: new RegExp(`Σ\\((${SYMBOLIC_IDENTIFIER_PATTERN})=([^→]+)→([^)]+)\\)\\(`, 'gu') },
      { name: 'prod', regex: new RegExp(`Π\\((${SYMBOLIC_IDENTIFIER_PATTERN})=([^→]+)→([^)]+)\\)\\(`, 'gu') },
      { name: 'integDef', regex: /∫\(([^→]+)→([^)]+)\)\(/g },
      { name: 'integ', regex: /∫\(/g }
    ];

    for (const op of ops) {
      op.regex.lastIndex = 0;
      const match = op.regex.exec(result);
      if (match && match.index < earliestIndex) {
        earliestIndex = match.index;
        earliestMatch = { op, match };
      }
    }

    if (!earliestMatch) break;

    const { op, match } = earliestMatch;
    const startIndex = match.index;
    const innerStart = match.index + match[0].length - 1;
    
    const innerEnd = findMatchingParenthesis(result, innerStart);
    if (innerEnd === -1) break; 

    const innerExpr = result.slice(innerStart + 1, innerEnd);
    const translatedInnerExpr = translateSymbolicToNerdamerInternal(innerExpr, state);
    let nerdamerStr = '';
    let suffixRegexLength = 0;

    if (op.name === 'diff' || op.name === 'diffPart') {
      nerdamerStr = `diff(${translatedInnerExpr},${match[1]})`;
    } else if (op.name === 'diffN' || op.name === 'diffPartN') {
      nerdamerStr = `diff(${translatedInnerExpr},${match[2]},${match[1]})`;
    } else if (op.name === 'lim') {
      const translatedLimitTarget = translateSymbolicToNerdamerInternal(normalizeSymbolicInput(match[2]), state);
      nerdamerStr = `limit(${translatedInnerExpr},${match[1]},${translatedLimitTarget})`;
    } else if (op.name === 'sum') {
      const idx = match[1];
      const engineIdx = nextInternalIndexSymbol(state);
      const translatedLower = translateSymbolicToNerdamerInternal(normalizeSymbolicInput(match[2]), state);
      const translatedUpper = translateSymbolicToNerdamerInternal(normalizeSymbolicInput(match[3]), state);
      const remappedInner = remapBoundExpression(translatedInnerExpr, idx, engineIdx);
      nerdamerStr = `sum(${remappedInner},${engineIdx},${translatedLower},${translatedUpper})`;
    } else if (op.name === 'prod') {
      const idx = match[1];
      const engineIdx = nextInternalIndexSymbol(state);
      const translatedLower = translateSymbolicToNerdamerInternal(normalizeSymbolicInput(match[2]), state);
      const translatedUpper = translateSymbolicToNerdamerInternal(normalizeSymbolicInput(match[3]), state);
      const remappedInner = remapBoundExpression(translatedInnerExpr, idx, engineIdx);
      nerdamerStr = `product(${remappedInner},${engineIdx},${translatedLower},${translatedUpper})`;
     } else if (op.name === 'integDef') {
      const translatedLower = translateSymbolicToNerdamerInternal(normalizeSymbolicInput(match[1]), state);
      const translatedUpper = translateSymbolicToNerdamerInternal(normalizeSymbolicInput(match[2]), state);
      const suffixMatch = /^\)d\(([A-Za-zα-ωΑ-Ω][A-Za-z0-9α-ωΑ-Ω_]*)\)/u.exec(result.slice(innerEnd));
      if (suffixMatch) {
        nerdamerStr = `defint(${translatedInnerExpr},${translatedLower},${translatedUpper},${suffixMatch[1]})`;
        suffixRegexLength = suffixMatch[0].length - 1;
      } else {
        nerdamerStr = `defint(${translatedInnerExpr},${translatedLower},${translatedUpper},x)`;
      }
     } else if (op.name === 'integ') {
      const suffixMatch = /^\)d\(([A-Za-zα-ωΑ-Ω])\)/.exec(result.slice(innerEnd));
      if (suffixMatch) {
         nerdamerStr = `integrate(${translatedInnerExpr},${suffixMatch[1]})`;
         suffixRegexLength = suffixMatch[0].length - 1; 
      } else {
         nerdamerStr = `integrate(${translatedInnerExpr},x)`;
      }
    }

    const before = result.slice(0, startIndex);
    const after = result.slice(innerEnd + 1 + suffixRegexLength);
    result = before + nerdamerStr + after;
  }
  
  return result;
}

export function translateSymbolicToNerdamer(expr) {
  return translateSymbolicToNerdamerInternal(expr, { counter: 0 });
}

async function evaluateSymbolic(expression, nerdamerInstance) {
  const trimmed = normalizeSymbolicInput(expression);
  const translated = translateSymbolicToNerdamer(trimmed);

  if (translated === trimmed) {
    return null;
  }

  try {
    const finalNerdamerExpr = toNerdamerExpression(translated);
    const result = nerdamerInstance(finalNerdamerExpr).toString();
    return { success: true, result: fromNerdamerExpression(result) };
  } catch {
    return null;
  }
}

/**
 * Converts Unicode math notation to JavaScript-evaluable expression
 * @param {string} expr - The mathematical expression
 * @param {string} angleMode - 'rad', 'deg', or 'grad'
 */
function parseExpression(expr, angleMode = 'rad') {
  // Angle conversion factors
  const toRad = angleMode === 'deg' ? '*(Math.PI/180)' : angleMode === 'grad' ? '*(Math.PI/200)' : '';
  const fromRad = angleMode === 'deg' ? '*(180/Math.PI)' : angleMode === 'grad' ? '*(200/Math.PI)' : '';
  
  return expr
    // Constants
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/π/g, 'Math.PI')
    .replace(/∞/g, 'Infinity')
    .replace(/\be\b/g, 'Math.E')
    // Nth root notation: n√(value) -> Math.pow(value, 1/n)
    .replace(/(\d+)√\(([^)]+)\)/g, 'Math.pow($2,1/$1)')
    .replace(/\bnthroot\(([^,]+),([^)]+)\)/g, 'Math.pow($1,1/($2))')
    .replace(/\broot\(([^,]+),([^)]+)\)/g, 'Math.pow($1,1/($2))')
    // Basic functions
    .replace(/√\(/g, 'Math.sqrt(')
    .replace(/∛\(/g, '(x=>Math.pow(x,1/3))(')
    .replace(/∜\(/g, '(x=>Math.pow(x,1/4))(')
    .replace(/\bfloor\(/g, 'Math.floor(')
    .replace(/\bceil\(/g, 'Math.ceil(')
    .replace(/⌊([^⌋]+)⌋/g, 'Math.floor($1)')
    .replace(/⌈([^⌉]+)⌉/g, 'Math.ceil($1)')
    .replace(/\|([^|]+)\|/g, 'Math.abs($1)')
    .replace(/log₁₀\(/g, 'Math.log10(')
    .replace(/\blog10\(/g, 'Math.log10(')
    .replace(/\blog_b\(([^,]+),([^)]+)\)/g, '(Math.log($1)/Math.log($2))')
    .replace(/\bln\(/g, 'Math.log(')
    // Hyperbolic trig
    .replace(/\bsinh\(/g, 'Math.sinh(')
    .replace(/\bcosh\(/g, 'Math.cosh(')
    .replace(/\btanh\(/g, 'Math.tanh(')
    // Inverse trig (output conversion based on selected mode)
    .replace(/sin\^\(?-?1\)?\(/g, `((x)=>Math.asin(x)${fromRad})(`)
    .replace(/cos\^\(?-?1\)?\(/g, `((x)=>Math.acos(x)${fromRad})(`)
    .replace(/tan\^\(?-?1\)?\(/g, `((x)=>Math.atan(x)${fromRad})(`)
    .replace(/sin⁻¹\(/g, `((x)=>Math.asin(x)${fromRad})(`)
    .replace(/cos⁻¹\(/g, `((x)=>Math.acos(x)${fromRad})(`)
    .replace(/tan⁻¹\(/g, `((x)=>Math.atan(x)${fromRad})(`)
    // Trig (input conversion based on selected mode)
    .replace(/\bsin\(/g, `((x)=>Math.sin(x${toRad}))(`)
    .replace(/\bcos\(/g, `((x)=>Math.cos(x${toRad}))(`)
    .replace(/\btan\(/g, `((x)=>Math.tan(x${toRad}))(`)
    .replace(/\bcot\(/g, `((x)=>1/Math.tan(x${toRad}))(`)
    .replace(/\bsec\(/g, `((x)=>1/Math.cos(x${toRad}))(`)
    .replace(/\bcsc\(/g, `((x)=>1/Math.sin(x${toRad}))(`)
    .replace(/\bmode\(([^,]+),([^)]+)\)/g, '(($1)%($2))')
    // Operators
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/±/g, '+')  // treat ± as + for simplicity
    .replace(/\^/g, '**')
    .replace(/²/g, '**2')
    .replace(/³/g, '**3');
}

/**
 * Evaluates a mathematical expression and returns the result
 * @param {string} expression - The expression to evaluate
 * @param {string} angleMode - 'rad', 'deg', or 'grad' for trig functions
 * @returns {{ success: boolean, result?: number, error?: string }}
 */
export async function evaluate(expression, angleMode = 'rad') {
  if (!expression || !expression.trim()) {
    return { success: false, error: 'Empty expression' };
  }

  try {
    const normalizedExpression = normalizePrettyIndexNotation(
      normalizeVisualSumProductTemplates(
        normalizeLatexFractions(
          normalizeUnicodeScripts(normalizePrettyIndexNotation(expression))
        )
      )
    );
    const nerdamerInstance = await preloadSymbolicMath();
    const symbolic = await evaluateSymbolic(normalizedExpression, nerdamerInstance);
    if (symbolic) {
      return symbolic;
    }

    const parsed = parseExpression(normalizedExpression, angleMode);
    
    // Security check: prevent access to dangerous properties
    if (parsed.includes('__proto__') || parsed.includes('constructor') || 
        parsed.includes('prototype') || parsed.includes('Function')) {
      return { success: false, error: 'Invalid expression' };
    }

    const result = Function('"use strict"; return (' + parsed + ')')();

    // Validate result
    if (typeof result !== 'number') {
      return { success: false, error: 'Result is not a number' };
    }

    if (!isFinite(result)) {
      if (isNaN(result)) {
        return { success: false, error: 'Invalid operation (NaN)' };
      }
      // Division by zero or overflow
      return { success: false, error: 'Division by zero or overflow' };
    }

    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message || 'Computation error' };
  }
}

/**
 * Formats a numeric or symbolic result for display
 */
export function formatResult(num) {
  if (typeof num === 'string') {
    return num;
  }

  if (!isFinite(num)) {
    return num === Infinity ? '∞' : num === -Infinity ? '-∞' : 'Error';
  }

  if (Math.abs(num) < 1e-10) {
    return '0';
  }
  
  if (Number.isInteger(num)) {
    return String(num);
  }
  
  // Use fixed precision for cleaner display
  const str = num.toPrecision(10);
  return parseFloat(str).toString();
}
