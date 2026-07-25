import { normalizeImplicitMultiplication } from './mathEvaluator';

const REPLACEMENTS = [
  [/\bpi\b/gi, 'Math.PI'],
  [/π/g, 'Math.PI'],
  [/\be\b/g, 'Math.E'],
  // Text-form function names must resolve before their Unicode/visual-bracket
  // equivalents: each one expands to "Math.xxx(", which itself contains a
  // word-boundary match for "xxx(" (e.g. "Math.abs(" contains "abs(" right
  // after the "."). Running the visual pattern second would re-match that
  // output and double-wrap it into "Math.Math.abs(".
  [/\bsqrt\(/g, 'Math.sqrt('],
  [/\bfloor\(/g, 'Math.floor('],
  [/\bceil\(/g, 'Math.ceil('],
  [/\babs\(/g, 'Math.abs('],
  [/√\(/g, 'Math.sqrt('],
  [/⌊([^⌋]*)⌋/g, 'Math.floor($1)'],
  [/⌈([^⌉]*)⌉/g, 'Math.ceil($1)'],
  [/\|([^|]*)\|/g, 'Math.abs($1)'],
  [/\blog10\(/g, 'Math.log10('],
  [/\blog\(/g, 'Math.log10('],
  [/\bln\(/g, 'Math.log('],
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
  /Math\.(?:PI|E|sqrt|abs|floor|ceil|log10|log|asin|acos|atan|sin|cos|tan)|\d+\.?\d*|\.\d+|x|[+\-*/%().,]|\s+/g;

// A digit directly followed by a known function/constant name (e.g. "2sin(x)",
// "2pi") has no word boundary between them, so normalizeImplicitMultiplication's
// \b<name>\b protection never fires and the name gets letter-split. Insert an
// explicit "*" between the digit and the keyword before that step runs.
//
// Known limitation: this only handles a *digit* directly before a keyword. A
// variable letter directly before a keyword (e.g. "xsin(x)") is not handled -
// that's a rarer, more ambiguous notation and is intentionally out of scope.
const KEYWORD_NAMES = [
  'log10', 'log', 'ln', 'sqrt', 'abs', 'floor', 'ceil',
  'asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'pi', 'e',
];
const COEFFICIENT_KEYWORD_PATTERN = new RegExp(`(\\d)(${KEYWORD_NAMES.join('|')})\\b`, 'g');

function insertCoefficientMultiplication(expr) {
  return expr.replace(COEFFICIENT_KEYWORD_PATTERN, '$1*$2');
}

// Index of the first '=' not nested inside parens (so "f(x)=x^2" splits after
// the whole "f(x)", not at some '=' that might appear inside an argument).
function findTopLevelEquals(expr) {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth += 1;
    else if (expr[i] === ')') depth -= 1;
    else if (expr[i] === '=' && depth === 0) return i;
  }
  return -1;
}

function stripLhs(expr) {
  const eqIndex = findTopLevelEquals(expr);
  return eqIndex === -1 ? expr : expr.slice(eqIndex + 1).trim();
}

// Index of the first ',' not nested inside parens — separates a curve from
// its domain restriction, e.g. "x^2, 1<x<5" splits into "x^2" and "1<x<5".
function findTopLevelComma(expr) {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth += 1;
    else if (expr[i] === ')') depth -= 1;
    else if (expr[i] === ',' && depth === 0) return i;
  }
  return -1;
}

function evalConstant(expr) {
  let value;
  try {
    value = compileExpression(expr)(0);
  } catch {
    throw new Error(`Could not parse range bound "${expr.trim()}".`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Could not evaluate range bound "${expr.trim()}".`);
  }
  return value;
}

// Parse a domain restriction like "1<x<5", "1<=x<=5", "x>2", or "3>=x" into
// { min, minInclusive, max, maxInclusive }. Bounds default to ±Infinity for
// one-sided restrictions. Throws if the range doesn't parse.
function parseDomainRestriction(rangeExpr) {
  // Whitespace has no meaning here (compileExpression already tolerates it
  // within bound expressions too), so strip it all before matching — users
  // will naturally type "1 < x < 5", not "1<x<5".
  const trimmed = rangeExpr.replace(/\s+/g, '');

  let m = trimmed.match(/^(.+?)(<=|<)x(<=|<)(.+)$/);
  if (m) {
    const [, lowerExpr, lowerOp, upperOp, upperExpr] = m;
    return {
      min: evalConstant(lowerExpr),
      minInclusive: lowerOp === '<=',
      max: evalConstant(upperExpr),
      maxInclusive: upperOp === '<=',
    };
  }

  m = trimmed.match(/^x(<=|<|>=|>)(.+)$/);
  if (m) {
    const [, op, boundExpr] = m;
    const bound = evalConstant(boundExpr);
    if (op === '<') return { min: -Infinity, minInclusive: true, max: bound, maxInclusive: false };
    if (op === '<=') return { min: -Infinity, minInclusive: true, max: bound, maxInclusive: true };
    if (op === '>') return { min: bound, minInclusive: false, max: Infinity, maxInclusive: true };
    return { min: bound, minInclusive: true, max: Infinity, maxInclusive: true }; // '>='
  }

  m = trimmed.match(/^(.+?)(<=|<|>=|>)x$/);
  if (m) {
    const [, boundExpr, op] = m;
    const bound = evalConstant(boundExpr);
    if (op === '<') return { min: bound, minInclusive: false, max: Infinity, maxInclusive: true };
    if (op === '<=') return { min: bound, minInclusive: true, max: Infinity, maxInclusive: true };
    if (op === '>') return { min: -Infinity, minInclusive: true, max: bound, maxInclusive: false };
    return { min: -Infinity, minInclusive: true, max: bound, maxInclusive: true }; // '>='
  }

  throw new Error(`Could not parse range "${rangeExpr.trim()}".`);
}

function inDomain(x, domain) {
  const aboveMin = domain.minInclusive ? x >= domain.min : x > domain.min;
  const belowMax = domain.maxInclusive ? x <= domain.max : x < domain.max;
  return aboveMin && belowMax;
}

function toJsExpression(expr) {
  let js = normalizeImplicitMultiplication(insertCoefficientMultiplication(stripLhs(expr.trim())));
  for (const [pattern, replacement] of REPLACEMENTS) {
    js = js.replace(pattern, replacement);
  }
  return js;
}

export function compileExpression(expr) {
  if (typeof expr !== 'string' || !expr.trim()) {
    throw new Error('Expression is empty.');
  }

  const commaIndex = findTopLevelComma(expr);
  const curvePart = commaIndex === -1 ? expr : expr.slice(0, commaIndex);
  const domain = commaIndex === -1 ? null : parseDomainRestriction(expr.slice(commaIndex + 1));

  const jsExpr = toJsExpression(curvePart);
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
    throw new Error(`Could not parse expression: ${curvePart}`);
  }

  return function evaluateAt(x) {
    if (domain && !inDomain(x, domain)) return NaN;
    try {
      const y = fn(x);
      return typeof y === 'number' && Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
}

const NAME_PATTERN = /^[A-Za-z_]\w*$/;

// Recognize "y = <rhs>" or "f(x) = <rhs>" as a *named* definition — as
// opposed to a bare "sin(x)" or "2x+1" curve, which has no name other rows
// can reference. Returns null for anything that isn't a named definition.
export function parseNamedDefinition(expr) {
  const trimmed = expr.trim();
  const eqIndex = findTopLevelEquals(trimmed);
  if (eqIndex === -1) return null;

  const lhs = trimmed.slice(0, eqIndex).trim();
  const body = trimmed.slice(eqIndex + 1).trim();
  if (!body) return null;

  if (NAME_PATTERN.test(lhs)) {
    return { name: lhs, body };
  }
  const match = lhs.match(/^([A-Za-z_]\w*)\(\s*x\s*\)$/);
  if (match) {
    return { name: match[1], body };
  }
  return null;
}

// Recognize "name(argExpr)" as a call to a name defined elsewhere in the
// function list (e.g. "y(1)" once some other row defines "y = ..."), with a
// concrete argument rather than another function of x. `knownNames` is the
// set of names currently defined across all rows (see parseNamedDefinition).
export function parseFunctionQuery(expr, knownNames) {
  const trimmed = expr.trim();
  const match = trimmed.match(/^([A-Za-z_]\w*)\(([^()]*)\)$/);
  if (!match) return null;
  const [, name, argExpr] = match;
  if (!knownNames.has(name)) return null;
  if (/\bx\b/.test(argExpr)) return null;
  return { name, argExpr: argExpr.trim() };
}

// Evaluate a query (from parseFunctionQuery) against a Map of name → body
// (built by running parseNamedDefinition over every row). Throws with a
// human-readable message on failure, matching compileExpression's contract.
export function evaluateFunctionQuery(query, definitions) {
  const body = definitions.get(query.name);
  if (body === undefined) {
    throw new Error(`"${query.name}" is not defined.`);
  }

  const argValue = compileExpression(query.argExpr)(0);
  if (!Number.isFinite(argValue)) {
    throw new Error(`Could not evaluate "${query.argExpr}".`);
  }

  const result = compileExpression(body)(argValue);
  if (!Number.isFinite(result)) {
    throw new Error(`${query.name}(${query.argExpr}) is undefined.`);
  }
  return result;
}
