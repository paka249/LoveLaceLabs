import { normalizeImplicitMultiplication } from './mathEvaluator';

const REPLACEMENTS = [
  [/\bpi\b/gi, 'Math.PI'],
  [/π/g, 'Math.PI'],
  [/\be\b/g, 'Math.E'],
  [/√\(/g, 'Math.sqrt('],
  [/\bsqrt\(/g, 'Math.sqrt('],
  [/\babs\(/g, 'Math.abs('],
  [/\bfloor\(/g, 'Math.floor('],
  [/\bceil\(/g, 'Math.ceil('],
  [/\bln\(/g, 'Math.log('],
  [/\blog10\(/g, 'Math.log10('],
  [/\blog\(/g, 'Math.log10('],
  [/\basin\(/g, 'Math.asin('],
  [/\bacos\(/g, 'Math.acos('],
  [/\batan\(/g, 'Math.atan('],
  [/\bsin\(/g, 'Math.sin('],
  [/\bcos\(/g, 'Math.cos('],
  [/\btan\(/g, 'Math.tan('],
  [/×/g, '*'],
  [/÷/g, '/'],
  [/\^/g, '**'],
];

const SAFE_TOKEN =
  /Math\.(?:PI|E|sqrt|abs|floor|ceil|log10|asin|acos|atan|sin|cos|tan)|\d+\.?\d*|\.\d+|x|[+\-*/%().,]|\s+/g;

function toJsExpression(expr) {
  let js = normalizeImplicitMultiplication(expr.trim());
  for (const [pattern, replacement] of REPLACEMENTS) {
    js = js.replace(pattern, replacement);
  }
  return js;
}

export function compileExpression(expr) {
  if (typeof expr !== 'string' || !expr.trim()) {
    throw new Error('Expression is empty.');
  }

  const jsExpr = toJsExpression(expr);
  const unsafeRemainder = jsExpr.replace(SAFE_TOKEN, '');
  if (unsafeRemainder.length > 0) {
    throw new Error(`Unsupported syntax near "${unsafeRemainder[0]}".`);
  }

  let fn;
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function('x', `"use strict"; return (${jsExpr});`);
    fn(1);
  } catch {
    throw new Error(`Could not parse expression: ${expr}`);
  }

  return function evaluateAt(x) {
    try {
      const y = fn(x);
      return typeof y === 'number' && Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
}
