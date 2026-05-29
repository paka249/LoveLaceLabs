/**
 * Mathematical expression evaluator
 * Handles parsing Unicode math notation and computing results
 */

/**
 * Converts Unicode math notation to JavaScript-evaluable expression
 */
function parseExpression(expr) {
  return expr
    // Functions
    .replace(/√\(/g, 'Math.sqrt(')
    .replace(/∛\(/g, '(x=>Math.pow(x,1/3))(')
    .replace(/∜\(/g, '(x=>Math.pow(x,1/4))(')
    .replace(/⌊([^⌋]+)⌋/g, 'Math.floor($1)')
    .replace(/⌈([^⌉]+)⌉/g, 'Math.ceil($1)')
    .replace(/\|([^|]+)\|/g, 'Math.abs($1)')
    .replace(/log₁₀\(/g, 'Math.log10(')
    .replace(/\bln\(/g, 'Math.log(')
    .replace(/\bsin\(/g, 'Math.sin(')
    .replace(/\bcos\(/g, 'Math.cos(')
    .replace(/\btan\(/g, 'Math.tan(')
    .replace(/\bcot\(/g, '(x=>1/Math.tan(x))(')
    .replace(/\bsec\(/g, '(x=>1/Math.cos(x))(')
    .replace(/\bcsc\(/g, '(x=>1/Math.sin(x))(')
    .replace(/sin⁻¹\(/g, 'Math.asin(')
    .replace(/cos⁻¹\(/g, 'Math.acos(')
    .replace(/tan⁻¹\(/g, 'Math.atan(')
    .replace(/\bsinh\(/g, 'Math.sinh(')
    .replace(/\bcosh\(/g, 'Math.cosh(')
    .replace(/\btanh\(/g, 'Math.tanh(')
    // Constants - must come before operators since they use Unicode
    .replace(/π/g, 'Math.PI')
    .replace(/∞/g, 'Infinity')
    .replace(/\be\b/g, 'Math.E')
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
 * @returns {{ success: boolean, result?: number, error?: string }}
 */
export function evaluate(expression) {
  if (!expression || !expression.trim()) {
    return { success: false, error: 'Empty expression' };
  }

  try {
    const parsed = parseExpression(expression);
    
    // Security check: prevent access to dangerous properties
    if (parsed.includes('__proto__') || parsed.includes('constructor') || 
        parsed.includes('prototype') || parsed.includes('Function')) {
      return { success: false, error: 'Invalid expression' };
    }

    // eslint-disable-next-line no-new-func
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
 * Formats a numeric result for display
 */
export function formatResult(num) {
  if (!isFinite(num)) {
    return num === Infinity ? '∞' : num === -Infinity ? '-∞' : 'Error';
  }
  
  if (Number.isInteger(num)) {
    return String(num);
  }
  
  // Use fixed precision for cleaner display
  const str = num.toPrecision(10);
  return parseFloat(str).toString();
}
