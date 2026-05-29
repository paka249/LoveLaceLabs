/**
 * Mathematical expression evaluator
 * Handles parsing Unicode math notation and computing results
 */

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
export function evaluate(expression, angleMode = 'rad') {
  if (!expression || !expression.trim()) {
    return { success: false, error: 'Empty expression' };
  }

  try {
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
 * Formats a numeric result for display
 */
export function formatResult(num) {
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
