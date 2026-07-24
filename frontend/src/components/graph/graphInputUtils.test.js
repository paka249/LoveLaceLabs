import { describe, it, expect, beforeEach } from 'vitest';
import { serializeInput, deserializeToHtml, ZWSP } from './graphInputUtils';

function makeEl(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('serializeInput', () => {
  it('returns plain text unchanged', () => {
    expect(serializeInput(makeEl('sin(x)'))).toBe('sin(x)');
  });

  it('converts a <sup> to ^{content}', () => {
    expect(serializeInput(makeEl('x<sup>2</sup>+1'))).toBe('x^2+1');
  });

  it('handles multiple superscripts', () => {
    expect(serializeInput(makeEl('x<sup>2</sup>+y<sup>3</sup>'))).toBe('x^2+y^3');
  });

  it('ignores <br> and other elements', () => {
    expect(serializeInput(makeEl('x<br>+1'))).toBe('x+1');
  });

  it('returns empty string for empty element', () => {
    expect(serializeInput(makeEl(''))).toBe('');
  });

  it('strips the ZWSP caret-anchor placeholder from sup content', () => {
    expect(serializeInput(makeEl(`x<sup>${ZWSP}2</sup>`))).toBe('x^2');
  });

  it('strips a bare ZWSP-only sup down to a bare caret', () => {
    expect(serializeInput(makeEl(`x<sup>${ZWSP}</sup>`))).toBe('x^');
  });

  it('strips ZWSP from plain text segments too', () => {
    expect(serializeInput(makeEl(`x<sup>${ZWSP}2</sup>${ZWSP}+1`))).toBe('x^2+1');
  });
});

describe('deserializeToHtml', () => {
  it('returns empty string for empty input', () => {
    expect(deserializeToHtml('')).toBe('');
  });

  it('returns escaped plain text when no ^ present', () => {
    expect(deserializeToHtml('sin(x)')).toBe('sin(x)');
  });

  it('wraps the exponent in <sup>', () => {
    expect(deserializeToHtml('x^2')).toBe('x<sup>2</sup>');
  });

  it('puts trailing non-exponent text outside the sup', () => {
    expect(deserializeToHtml('x^2+1')).toBe('x<sup>2</sup>+1');
  });

  it('handles parenthesised exponents', () => {
    expect(deserializeToHtml('x^(n+1)')).toBe('x<sup>(n+1)</sup>');
  });

  it('handles multiple carets', () => {
    expect(deserializeToHtml('x^2+y^3')).toBe('x<sup>2</sup>+y<sup>3</sup>');
  });

  it('HTML-escapes dangerous characters in text segments', () => {
    expect(deserializeToHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
  });

  it('round-trips: serialize(deserialize(str)) === str for common expressions', () => {
    const exprs = ['x^2+1', 'sin(x^2)', 'x^(n+1)+y^3', '2x+1'];
    for (const expr of exprs) {
      const el = makeEl(deserializeToHtml(expr));
      expect(serializeInput(el)).toBe(expr);
    }
  });

  it('shows abs(x) with visual bracket notation', () => {
    expect(deserializeToHtml('abs(x)')).toBe('|x|');
  });

  it('shows sqrt(x) with a radical prefix', () => {
    expect(deserializeToHtml('sqrt(x)')).toBe('√(x)');
  });

  it('shows floor(x) and ceil(x) with their bracket glyphs', () => {
    expect(deserializeToHtml('floor(x)')).toBe('⌊x⌋');
    expect(deserializeToHtml('ceil(x)')).toBe('⌈x⌉');
  });

  it('recursively parses an exponent nested inside a function call', () => {
    expect(deserializeToHtml('abs(x^2)')).toBe('|x<sup>2</sup>|');
  });

  it('a simple (non-parenthesized) exponent stops before a paren, matching live-typing semantics', () => {
    // "x^abs(2)" in keyword form isn't something live typing ever produces
    // (live typing promotes "abs(" to "|" immediately, before "^" ever sees
    // it), so this documents the existing simple-exponent boundary rather
    // than claiming function calls nest inside a bare (unparenthesized) '^'.
    expect(deserializeToHtml('x^abs(2)')).toBe('x<sup>abs</sup>(2)');
  });

  it('round-trips the glyph form a live-typed nested function-in-exponent actually produces', () => {
    // Typing "x^abs(2)" live promotes "abs(" to "|" while already inside the
    // sup, so the stored value is "x^|2|" (glyph form), not "x^abs(2)". That
    // must still reproduce the same nested <sup> on reload.
    expect(deserializeToHtml('x^|2|')).toBe('x<sup>|2|</sup>');
  });

  it('does not treat a function name inside a longer identifier as a match', () => {
    expect(deserializeToHtml('myabs(x)')).toBe('myabs(x)');
  });
});
