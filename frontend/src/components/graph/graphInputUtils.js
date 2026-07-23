export const ZWSP = '​';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Walk a contenteditable div's childNodes → plain expression string.
// Text nodes pass through; <sup> nodes become ^{textContent}; all others skipped.
// ZWSP is a caret-anchoring placeholder (see GraphFunctionInput) and never part
// of the logical expression, so it's stripped here.
export function serializeInput(el) {
  let result = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeName === 'SUP') {
      result += '^' + node.textContent;
    }
  }
  return result.split(ZWSP).join('');
}

// Convert a plain expression string to innerHTML for a contenteditable div.
// "x^2+1" → "x<sup>2</sup>+1"
// "x^(n+1)" → "x<sup>(n+1)</sup>"
export function deserializeToHtml(str) {
  if (!str) return '';

  const segments = str.split('^');
  let html = escapeHtml(segments[0]);

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    let expEnd;

    if (seg.startsWith('(')) {
      // Take until matching close paren
      let depth = 0;
      expEnd = seg.length;
      for (let j = 0; j < seg.length; j++) {
        if (seg[j] === '(') depth += 1;
        else if (seg[j] === ')') {
          depth -= 1;
          if (depth === 0) { expEnd = j + 1; break; }
        }
      }
    } else {
      // Take until space or arithmetic operator
      const m = seg.search(/[\s+\-*/^%(]/);
      expEnd = m === -1 ? seg.length : m;
    }

    const exp = seg.slice(0, expEnd);
    const rest = seg.slice(expEnd);
    html += `<sup>${escapeHtml(exp)}</sup>${escapeHtml(rest)}`;
  }

  return html;
}
