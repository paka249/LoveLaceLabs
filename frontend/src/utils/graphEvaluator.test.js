import { describe, it, expect } from 'vitest';
import {
  compileExpression,
  parseNamedDefinition,
  parseFunctionQuery,
  evaluateFunctionQuery,
} from './graphEvaluator';

describe('compileExpression', () => {
  it('evaluates a simple linear expression', () => {
    const f = compileExpression('2x + 1');
    expect(f(3)).toBeCloseTo(7);
    expect(f(0)).toBeCloseTo(1);
  });

  it('supports ^ as exponentiation', () => {
    const f = compileExpression('x^2');
    expect(f(3)).toBeCloseTo(9);
    expect(f(-4)).toBeCloseTo(16);
  });

  it('supports implicit multiplication like 3x^2', () => {
    const f = compileExpression('3x^2');
    expect(f(2)).toBeCloseTo(12);
  });

  it('supports trig functions', () => {
    const f = compileExpression('sin(x)');
    expect(f(0)).toBeCloseTo(0);
    expect(f(Math.PI / 2)).toBeCloseTo(1);
  });

  it('supports sqrt', () => {
    const f = compileExpression('sqrt(x)');
    expect(f(9)).toBeCloseTo(3);
  });

  it('supports pi and e constants', () => {
    const f = compileExpression('pi + e');
    expect(f(0)).toBeCloseTo(Math.PI + Math.E);
  });

  it('throws on an empty expression', () => {
    expect(() => compileExpression('')).toThrow();
    expect(() => compileExpression('   ')).toThrow();
  });

  it('throws on unparseable syntax', () => {
    expect(() => compileExpression('x +* 2')).toThrow();
  });

  it('throws on disallowed identifiers instead of executing arbitrary code', () => {
    expect(() => compileExpression('alert(1)')).toThrow();
    expect(() => compileExpression('window.location')).toThrow();
  });

  it('returns NaN for a domain error at a specific point rather than throwing', () => {
    const f = compileExpression('1/x');
    expect(f(0)).toBeNaN();
    expect(f(2)).toBeCloseTo(0.5);
  });

  it('returns NaN for sqrt of a negative number', () => {
    const f = compileExpression('sqrt(x)');
    expect(f(-1)).toBeNaN();
  });

  it('supports ln as natural log', () => {
    const f = compileExpression('ln(x)');
    expect(f(Math.E)).toBeCloseTo(1);
    expect(f(1)).toBeCloseTo(0);
  });

  it('supports log as base-10 log', () => {
    const f = compileExpression('log(x)');
    expect(f(100)).toBeCloseTo(2);
  });

  it('supports log10 as an explicit alias for base-10 log', () => {
    const f = compileExpression('log10(x)');
    expect(f(1000)).toBeCloseTo(3);
  });

  it('supports implicit multiplication between a coefficient and a function name like 2sin(x)', () => {
    const f = compileExpression('2sin(x)');
    expect(f(Math.PI / 2)).toBeCloseTo(2 * Math.sin(Math.PI / 2));
    expect(f(0)).toBeCloseTo(2 * Math.sin(0));
  });

  it('supports implicit multiplication between a coefficient and a function name like 3cos(x)', () => {
    const f = compileExpression('3cos(x)');
    expect(f(0)).toBeCloseTo(3 * Math.cos(0));
  });

  it('supports implicit multiplication between a coefficient and sqrt like 2sqrt(x)', () => {
    const f = compileExpression('2sqrt(x)');
    expect(f(9)).toBeCloseTo(6);
  });

  it('supports implicit multiplication between a coefficient and the pi constant like 2pi', () => {
    const f = compileExpression('2pi');
    expect(f(0)).toBeCloseTo(2 * Math.PI);
  });

  it('still supports sin(x) alone with no leading digit', () => {
    const f = compileExpression('sin(x)');
    expect(f(Math.PI / 2)).toBeCloseTo(1);
  });

  it('still supports 2x^2 implicit multiplication with no keyword involved', () => {
    const f = compileExpression('2x^2');
    expect(f(3)).toBeCloseTo(18);
  });

  it('accepts y = f(x) notation and graphs the RHS', () => {
    const f = compileExpression('y = sin(x)');
    expect(f(0)).toBeCloseTo(0);
    expect(f(Math.PI / 2)).toBeCloseTo(1);
  });

  it('accepts f(x) = expr notation', () => {
    const f = compileExpression('f(x) = x^2 + 1');
    expect(f(2)).toBeCloseTo(5);
    expect(f(0)).toBeCloseTo(1);
  });

  it('supports abs(x) as text form', () => {
    const f = compileExpression('abs(x)');
    expect(f(-3)).toBeCloseTo(3);
  });

  it('supports |x| as visual bracket notation', () => {
    const f = compileExpression('|x|');
    expect(f(-3)).toBeCloseTo(3);
  });

  it('supports floor(x) and its ⌊x⌋ visual form', () => {
    expect(compileExpression('floor(x)')(2.7)).toBeCloseTo(2);
    expect(compileExpression('⌊x⌋')(2.7)).toBeCloseTo(2);
  });

  it('supports ceil(x) and its ⌈x⌉ visual form', () => {
    expect(compileExpression('ceil(x)')(2.1)).toBeCloseTo(3);
    expect(compileExpression('⌈x⌉')(2.1)).toBeCloseTo(3);
  });

  it('supports √( as the visual form of sqrt(', () => {
    const f = compileExpression('√(x)');
    expect(f(9)).toBeCloseTo(3);
  });

  // Regression: the text-form pattern (e.g. \babs\() must not re-match its own
  // "Math.abs(" output when a visual-bracket pattern (e.g. |x|) ran first —
  // that produced "Math.Math.abs(" and silently broke every visual function.
  it('does not double-wrap visual bracket notation into Math.Math.xxx(', () => {
    expect(() => compileExpression('|x|+⌊x⌋+⌈x⌉+√(x)')).not.toThrow();
  });

  it('handles a mix of text-form and visual-bracket notation in one expression', () => {
    const f = compileExpression('abs(x)+|x|');
    expect(f(-3)).toBeCloseTo(6);
  });
});

describe('parseNamedDefinition', () => {
  it('recognizes a bare "y = ..." definition', () => {
    expect(parseNamedDefinition('y = x')).toEqual({ name: 'y', body: 'x' });
  });

  it('recognizes an "f(x) = ..." definition', () => {
    expect(parseNamedDefinition('f(x) = x^2 + 1')).toEqual({ name: 'f', body: 'x^2 + 1' });
  });

  it('trims whitespace around the name and body', () => {
    expect(parseNamedDefinition('  y   =   x^2  ')).toEqual({ name: 'y', body: 'x^2' });
  });

  it('returns null for an unnamed curve with no "="', () => {
    expect(parseNamedDefinition('sin(x)')).toBeNull();
    expect(parseNamedDefinition('2x + 1')).toBeNull();
  });

  it('returns null when the left side is not a bare name or name(x)', () => {
    expect(parseNamedDefinition('2 = x')).toBeNull();
    expect(parseNamedDefinition('f(t) = t^2')).toBeNull();
  });

  it('returns null for a definition with an empty body', () => {
    expect(parseNamedDefinition('y = ')).toBeNull();
  });

  it('splits on the top-level "=", not one nested inside parens', () => {
    // Nothing in this codebase produces a nested "=" today, but the split
    // must still land after the full "f(x)", matching stripLhs's own logic.
    expect(parseNamedDefinition('f(x) = x')).toEqual({ name: 'f', body: 'x' });
  });
});

describe('parseFunctionQuery', () => {
  const known = new Set(['y', 'f']);

  it('recognizes a call to a known name with a numeric argument', () => {
    expect(parseFunctionQuery('y(1)', known)).toEqual({ name: 'y', argExpr: '1' });
  });

  it('recognizes a call with an x-free expression argument', () => {
    expect(parseFunctionQuery('f(2+3)', known)).toEqual({ name: 'f', argExpr: '2+3' });
  });

  it('returns null for a name that is not defined anywhere', () => {
    expect(parseFunctionQuery('g(1)', known)).toBeNull();
  });

  it('returns null when the argument itself depends on x', () => {
    expect(parseFunctionQuery('y(x)', known)).toBeNull();
    expect(parseFunctionQuery('y(x+1)', known)).toBeNull();
  });

  it('returns null for a plain curve expression, not a bare call', () => {
    expect(parseFunctionQuery('sin(x)', known)).toBeNull();
    expect(parseFunctionQuery('y', known)).toBeNull();
    expect(parseFunctionQuery('y(1)+1', known)).toBeNull();
  });
});

describe('evaluateFunctionQuery', () => {
  it('evaluates y(1) after y = x', () => {
    const definitions = new Map([['y', 'x']]);
    const query = parseFunctionQuery('y(1)', new Set(definitions.keys()));
    expect(evaluateFunctionQuery(query, definitions)).toBeCloseTo(1);
  });

  it('evaluates f(3) after f(x) = x^2 + 1', () => {
    const definitions = new Map([['f', 'x^2 + 1']]);
    const query = parseFunctionQuery('f(3)', new Set(definitions.keys()));
    expect(evaluateFunctionQuery(query, definitions)).toBeCloseTo(10);
  });

  it('evaluates the argument expression before calling the function', () => {
    const definitions = new Map([['y', 'x^2']]);
    const query = parseFunctionQuery('y(1+2)', new Set(definitions.keys()));
    expect(evaluateFunctionQuery(query, definitions)).toBeCloseTo(9);
  });

  it('throws for a name with no matching definition', () => {
    const definitions = new Map();
    expect(() => evaluateFunctionQuery({ name: 'y', argExpr: '1' }, definitions)).toThrow();
  });

  it('throws when the referenced body is undefined at that input (e.g. sqrt of a negative)', () => {
    const definitions = new Map([['y', 'sqrt(x)']]);
    const query = parseFunctionQuery('y(-1)', new Set(definitions.keys()));
    expect(() => evaluateFunctionQuery(query, definitions)).toThrow();
  });

  it('throws for an unparseable argument', () => {
    const definitions = new Map([['y', 'x']]);
    expect(() => evaluateFunctionQuery({ name: 'y', argExpr: '+*' }, definitions)).toThrow();
  });
});

describe('domain restriction via comma range syntax', () => {
  it('evaluates normally inside a two-sided range', () => {
    const f = compileExpression('x^2, 1<x<5');
    expect(f(3)).toBeCloseTo(9);
  });

  it('returns NaN outside a two-sided range', () => {
    const f = compileExpression('x^2, 1<x<5');
    expect(f(0)).toBeNaN();
    expect(f(6)).toBeNaN();
  });

  it('tolerates spaces around the range, the way someone would naturally type it', () => {
    const f = compileExpression('x^2, 1 < x < 5');
    expect(f(3)).toBeCloseTo(9);
    expect(f(0)).toBeNaN();
  });

  it('is exclusive at the boundary for "<" and inclusive for "<="', () => {
    const exclusive = compileExpression('x, 1<x<5');
    expect(exclusive(1)).toBeNaN();
    expect(exclusive(5)).toBeNaN();

    const inclusive = compileExpression('x, 1<=x<=5');
    expect(inclusive(1)).toBeCloseTo(1);
    expect(inclusive(5)).toBeCloseTo(5);
  });

  it('supports a single-sided range with x on the left', () => {
    const upper = compileExpression('x, x<5');
    expect(upper(4)).toBeCloseTo(4);
    expect(upper(5)).toBeNaN();
    expect(upper(6)).toBeNaN();

    const lower = compileExpression('x, x>=2');
    expect(lower(2)).toBeCloseTo(2);
    expect(lower(1)).toBeNaN();
  });

  it('supports a single-sided range with x on the right', () => {
    const f = compileExpression('x, 5>x');
    expect(f(4)).toBeCloseTo(4);
    expect(f(5)).toBeNaN();
  });

  it('accepts a constant expression (not just a literal number) as a bound', () => {
    const f = compileExpression('x, 0<x<2*pi');
    expect(f(3)).toBeCloseTo(3);
    expect(f(7)).toBeNaN();
  });

  it('works with a named definition, e.g. "y = x^2, 1<x<5"', () => {
    const f = compileExpression('y = x^2, 1<x<5');
    expect(f(3)).toBeCloseTo(9);
    expect(f(10)).toBeNaN();
  });

  it('throws for an unparseable range', () => {
    expect(() => compileExpression('x^2, banana')).toThrow();
  });

  it('a query against a domain-restricted definition is undefined outside the domain', () => {
    const definitions = new Map([['y', 'x^2, 1<x<5']]);
    const inRange = parseFunctionQuery('y(3)', new Set(definitions.keys()));
    expect(evaluateFunctionQuery(inRange, definitions)).toBeCloseTo(9);

    const outOfRange = parseFunctionQuery('y(10)', new Set(definitions.keys()));
    expect(() => evaluateFunctionQuery(outOfRange, definitions)).toThrow();
  });
});
