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
});
