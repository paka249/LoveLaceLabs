/**
 * Mathematical expression evaluator
 * Handles parsing Unicode math notation and computing results
 */

let symbolicMathPromise;

const PROTECTED_SYMBOLIC_IDENTIFIERS = [
  'log10', 'sinh', 'cosh', 'tanh',
  'asin', 'acos', 'atan',
  'sqrt', 'root',
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
    .replace(/log₁₀\(/g, 'log10(')
    .replace(/\bln\(/g, 'log(')
    .replace(/sin⁻¹\(/g, 'asin(')
    .replace(/cos⁻¹\(/g, 'acos(')
    .replace(/tan⁻¹\(/g, 'atan('));
}

function fromNerdamerExpression(expr) {
  return expr.replace(/\bpi\b/g, 'π');
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

async function unwrapSymbolicOperand(expr, nerdamerInstance) {
  const inner = normalizeSymbolicInput(expr);
  const nested = await evaluateSymbolic(inner, nerdamerInstance);
  return nested?.success ? toNerdamerExpression(String(nested.result)) : toNerdamerExpression(inner);
}

async function evaluateSymbolic(expression, nerdamerInstance) {
  const trimmed = normalizeSymbolicInput(expression);
  const explicitIntegralMatch = trimmed.match(/^∫\((.*)\)d\(([A-Za-zα-ωΑ-Ω])\)$/s);

  if (explicitIntegralMatch) {
    const [, innerExpr, variable] = explicitIntegralMatch;
    const inner = await unwrapSymbolicOperand(innerExpr, nerdamerInstance);
    const result = nerdamerInstance(`integrate(${inner},${variable})`).toString();
    return { success: true, result: fromNerdamerExpression(result) };
  }

  if (trimmed.startsWith('∫(') && trimmed.endsWith(')')) {
    const inner = await unwrapSymbolicOperand(trimmed.slice(2, -1), nerdamerInstance);
    const result = nerdamerInstance(`integrate(${inner},x)`).toString();
    return { success: true, result: fromNerdamerExpression(result) };
  }

  const firstDerivativeMatch = trimmed.match(/^d\/d([A-Za-zα-ωΑ-Ω])\((.*)\)$/s);
  if (firstDerivativeMatch) {
    const [, variable, innerExpr] = firstDerivativeMatch;
    const inner = await unwrapSymbolicOperand(innerExpr, nerdamerInstance);
    const result = nerdamerInstance(`diff(${inner},${variable})`).toString();
    return { success: true, result: fromNerdamerExpression(result) };
  }

  const firstPartialMatch = trimmed.match(/^∂\/∂([A-Za-zα-ωΑ-Ω])\((.*)\)$/s);
  if (firstPartialMatch) {
    const [, variable, innerExpr] = firstPartialMatch;
    const inner = await unwrapSymbolicOperand(innerExpr, nerdamerInstance);
    const result = nerdamerInstance(`diff(${inner},${variable})`).toString();
    return { success: true, result: fromNerdamerExpression(result) };
  }

  const nthDerivativeMatch = trimmed.match(/^d\^(\d+)\/d([A-Za-zα-ωΑ-Ω])\^\1\((.*)\)$/s);
  if (nthDerivativeMatch) {
    const [, order, variable, innerExpr] = nthDerivativeMatch;
    const inner = await unwrapSymbolicOperand(innerExpr, nerdamerInstance);
    const result = nerdamerInstance(`diff(${inner},${variable},${order})`).toString();
    return { success: true, result: fromNerdamerExpression(result) };
  }

  const nthPartialMatch = trimmed.match(/^∂\^(\d+)\/∂([A-Za-zα-ωΑ-Ω])\^\1\((.*)\)$/s);
  if (nthPartialMatch) {
    const [, order, variable, innerExpr] = nthPartialMatch;
    const inner = await unwrapSymbolicOperand(innerExpr, nerdamerInstance);
    const result = nerdamerInstance(`diff(${inner},${variable},${order})`).toString();
    return { success: true, result: fromNerdamerExpression(result) };
  }

  return null;
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
    // Basic functions
    .replace(/√\(/g, 'Math.sqrt(')
    .replace(/∛\(/g, '(x=>Math.pow(x,1/3))(')
    .replace(/∜\(/g, '(x=>Math.pow(x,1/4))(')
    .replace(/⌊([^⌋]+)⌋/g, 'Math.floor($1)')
    .replace(/⌈([^⌉]+)⌉/g, 'Math.ceil($1)')
    .replace(/\|([^|]+)\|/g, 'Math.abs($1)')
    .replace(/log₁₀\(/g, 'Math.log10(')
    .replace(/\bln\(/g, 'Math.log(')
    // Hyperbolic trig
    .replace(/\bsinh\(/g, 'Math.sinh(')
    .replace(/\bcosh\(/g, 'Math.cosh(')
    .replace(/\btanh\(/g, 'Math.tanh(')
    // Inverse trig (output conversion based on selected mode)
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
    const nerdamerInstance = await preloadSymbolicMath();
    const symbolic = await evaluateSymbolic(expression, nerdamerInstance);
    if (symbolic) {
      return symbolic;
    }

    const parsed = parseExpression(expression, angleMode);
    
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
