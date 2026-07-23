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
});
