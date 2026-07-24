import { describe, it, expect } from 'vitest';
import { compileExpression } from './graphEvaluator';

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
