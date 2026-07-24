export const ZWSP = '​';

// Functions rendered with a distinct mathematical bracket notation instead of
// name+parens — e.g. abs(x) displays as |x|. This must stay in sync with the
// live-typing promotion in GraphFunctionInput (FN_BRACKETS/FN_VISUALS), since
// deserializeToHtml (mount/reload) has to reproduce the same visual the user
// would get from typing it fresh.
const FUNCTION_GLYPHS = {
  sqrt: { before: '√(', after: ')' },
  abs: { before: '|', after: '|' },
  floor: { before: '⌊', after: '⌋' },
  ceil: { before: '⌈', after: '⌉' },
};
const FUNCTION_NAMES = Object.keys(FUNCTION_GLYPHS);

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function serializeChildren(el) {
  let result = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeName === 'SUP') {
      result += '^' + serializeChildren(node);
    }
  }
  return result;
}

// Walk a contenteditable div's DOM → plain expression string.
// Text nodes pass through (including any glyphs like |x| or √( — those are
// already the literal expression form the evaluator understands); <sup>
// becomes ^{content}, recursively, so nesting (e.g. x^abs(2)) round-trips.
// ZWSP is a caret-anchoring placeholder (see GraphFunctionInput) and never
// part of the logical expression, so it's stripped here.
export function serializeInput(el) {
  return serializeChildren(el).split(ZWSP).join('');
}

// Index of the ')' that closes the '(' at openIndex, tracking nested depth.
// Bounded by `end` so it never reaches past the current recursive scope (e.g.
// a simple, non-parenthesized exponent body that ends before any real paren).
function findMatchingParen(str, openIndex, end) {
  let depth = 0;
  for (let i = openIndex; i < end; i++) {
    if (str[i] === '(') depth += 1;
    else if (str[i] === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return end;
}

// Does str[i..end) start a recognized function call, at a word boundary?
function matchFunctionKeyword(str, i, end) {
  for (const name of FUNCTION_NAMES) {
    const needle = `${name}(`;
    if (i + needle.length <= end && str.startsWith(needle, i)) {
      const prevChar = str[i - 1];
      if (!prevChar || !/[A-Za-z0-9_]/.test(prevChar)) return name;
    }
  }
  return null;
}

// Recursively convert the expression string slice [start, end) to HTML.
function parseToHtml(str, start, end) {
  let html = '';
  let textBuf = '';
  const flush = () => {
    if (textBuf) {
      html += escapeHtml(textBuf);
      textBuf = '';
    }
  };

  let i = start;
  while (i < end) {
    if (str[i] === '^') {
      flush();
      i += 1;
      if (str[i] === '(') {
        const close = findMatchingParen(str, i, end);
        html += `<sup>(${parseToHtml(str, i + 1, close)})</sup>`;
        i = close + 1;
      } else {
        // Take until whitespace, an arithmetic operator, or a paren.
        const stop = str.slice(i, end).search(/[\s+\-*/^%()]/);
        const expEnd = stop === -1 ? end : i + stop;
        html += `<sup>${parseToHtml(str, i, expEnd)}</sup>`;
        i = expEnd;
      }
      continue;
    }

    const kw = matchFunctionKeyword(str, i, end);
    if (kw) {
      flush();
      const openParen = i + kw.length;
      const close = findMatchingParen(str, openParen, end);
      const { before, after } = FUNCTION_GLYPHS[kw];
      html += escapeHtml(before) + parseToHtml(str, openParen + 1, close) + escapeHtml(after);
      i = close + 1;
      continue;
    }

    textBuf += str[i];
    i += 1;
  }
  flush();
  return html;
}

// Convert a plain expression string to innerHTML for a contenteditable div.
// "x^2+1" → "x<sup>2</sup>+1"
// "x^(n+1)" → "x<sup>(n+1)</sup>"
// "abs(x^2)" → "|x<sup>2</sup>|" (same glyph form live typing produces)
export function deserializeToHtml(str) {
  if (!str) return '';
  return parseToHtml(str, 0, str.length);
}
