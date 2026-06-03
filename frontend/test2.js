function findMatchingParenthesis(str, openPos) {
  let depth = 1;
  for (let i = openPos + 1; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function remapIndexSymbol(expr, fromSymbol, toSymbol) {
  if (fromSymbol === toSymbol) return expr;
  const pattern = new RegExp(`\\b${escapeRegExp(fromSymbol)}\\b`, 'g');
  return expr.replace(pattern, toSymbol);
}

export function translateSymbolicToNerdamer(expr) {
  let result = expr;
  let iterations = 0;
  while (iterations++ < 100) {
    let earliestMatch = null;
    let earliestIndex = Infinity;

    const ops = [
      { name: 'diff', regex: /d\/d([A-Za-zα-ωΑ-Ω])\(/g },
      { name: 'diffPart', regex: /∂\/∂([A-Za-zα-ωΑ-Ω])\(/g },
      { name: 'diffN', regex: /d\^(\d+)\/d([A-Za-zα-ωΑ-Ω])\^\1\(/g },
      { name: 'diffPartN', regex: /∂\^(\d+)\/∂([A-Za-zα-ωΑ-Ω])\^\1\(/g },
      { name: 'lim', regex: /lim\(([A-Za-zα-ωΑ-Ω])→([^)]+)\)\(/g },
      { name: 'sum', regex: /Σ\(([A-Za-zα-ωΑ-Ω])=([^→]+)→([^)]+)\)\(/g },
      { name: 'prod', regex: /Π\(([A-Za-zα-ωΑ-Ω])=([^→]+)→([^)]+)\)\(/g },
      { name: 'integ', regex: /∫\(/g }
    ];

    for (const op of ops) {
      op.regex.lastIndex = 0;
      const match = op.regex.exec(result);
      if (match && match.index < earliestIndex) {
        earliestIndex = match.index;
        earliestMatch = { op, match };
      }
    }

    if (!earliestMatch) break;

    const { op, match } = earliestMatch;
    const startIndex = match.index;
    const innerStart = match.index + match[0].length - 1;
    
    const innerEnd = findMatchingParenthesis(result, innerStart);
    if (innerEnd === -1) {
      console.warn("Unbalanced parens");
      break; 
    }

    const innerExpr = result.slice(innerStart + 1, innerEnd);
    let nerdamerStr = '';
    let suffixRegexLength = 0;

    if (op.name === 'diff' || op.name === 'diffPart') {
      nerdamerStr = `diff(${innerExpr},${match[1]})`;
    } else if (op.name === 'diffN' || op.name === 'diffPartN') {
      nerdamerStr = `diff(${innerExpr},${match[2]},${match[1]})`; // wait matches: [0] = d^2/dx^2(, [1] = 2, [2] = x
    } else if (op.name === 'lim') {
      nerdamerStr = `limit(${innerExpr},${match[1]},${match[2]})`;
    } else if (op.name === 'sum') {
      const idx = match[1];
      const engineIdx = idx === 'i' ? 'k' : idx;
      const remappedInner = remapIndexSymbol(innerExpr, idx, engineIdx);
      nerdamerStr = `sum(${remappedInner},${engineIdx},${match[2]},${match[3]})`;
    } else if (op.name === 'prod') {
      const idx = match[1];
      const engineIdx = idx === 'i' ? 'k' : idx;
      const remappedInner = remapIndexSymbol(innerExpr, idx, engineIdx);
      nerdamerStr = `product(${remappedInner},${engineIdx},${match[2]},${match[3]})`;
    } else if (op.name === 'integ') {
      const suffixMatch = /^\)d\(([A-Za-zα-ωΑ-Ω])\)/.exec(result.slice(innerEnd));
      if (suffixMatch) {
         nerdamerStr = `integrate(${innerExpr},${suffixMatch[1]})`;
         suffixRegexLength = suffixMatch[0].length - 1; 
      } else {
         nerdamerStr = `integrate(${innerExpr},x)`;
      }
    }

    const before = result.slice(0, startIndex);
    const after = result.slice(innerEnd + 1 + suffixRegexLength);
    result = before + nerdamerStr + after;
  }
  
  return result;
}

console.log(translateSymbolicToNerdamer('d/dt(t) + d/dt(t^2)'));
console.log(translateSymbolicToNerdamer('lim(x→0)(d/dx(sin(x)))'));
console.log(translateSymbolicToNerdamer('Σ(i=1→n)(i)'));
console.log(translateSymbolicToNerdamer('∫(x^2)d(x) + ∫(x)'));
