import { useLayoutEffect, useRef } from 'react';
import { serializeInput, deserializeToHtml, ZWSP } from './graphInputUtils';

// Functions that get auto-closed parens when the user types '('.
// Longer names must come first so endsWith matching doesn't hit a suffix early
// (e.g. 'asin' must precede 'sin').
const FN_NAMES = [
  'log10', 'asin', 'acos', 'atan',
  'sqrt', 'floor', 'ceil', 'abs',
  'sin', 'cos', 'tan', 'log', 'ln',
];

// Functions whose text is replaced with a Unicode symbol in the editor.
// The evaluator already handles √( → Math.sqrt( (see graphEvaluator REPLACEMENTS).
const FN_VISUALS = { sqrt: '√' };

// Functions that use bracket notation instead of parens: abs → |x|, floor → ⌊x⌋, ceil → ⌈x⌉.
// When detected, the fn name + '(' is replaced with open+close and the cursor lands between them.
const FN_BRACKETS = {
  abs:   { open: '|',  close: '|'  },
  floor: { open: '⌊', close: '⌋' },
  ceil:  { open: '⌈', close: '⌉' },
};

// A collapsed caret placed inside a truly empty text node has no client rect in
// most browsers, so native typing doesn't honor it — the next keystroke lands
// wherever the caret last had a real box instead. Seeding the node with a
// zero-width space gives it one; serializeInput strips ZWSP back out.
function placeCaret(sel, textNode, offset) {
  if (textNode.length === 0) {
    textNode.data = ZWSP;
    offset = 1;
  }
  const r = document.createRange();
  r.setStart(textNode, offset);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

export default function GraphFunctionInput({
  value,
  onChange,
  placeholder,
  isValid,
  onAddFunction,
  onMoveUp,
  onMoveDown,
  onEditorRef,
}) {
  const editorRef = useRef(null);

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value) el.innerHTML = deserializeToHtml(value);
    onEditorRef?.(el);
    return () => onEditorRef?.(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function isInsideSup(node) {
    let cur = node;
    while (cur && cur !== editorRef.current) {
      if (cur.nodeName === 'SUP') return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  function exitSup(supEl) {
    const sel = window.getSelection();
    if (!sel) return;
    let afterNode = supEl.nextSibling;
    if (!afterNode || afterNode.nodeType !== Node.TEXT_NODE) {
      afterNode = document.createTextNode('');
      supEl.after(afterNode);
    }
    placeCaret(sel, afterNode, 0);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onMoveDown?.();
      return;
    }

    // Skip over auto-inserted closing delimiters instead of inserting duplicates.
    // ')' is the key users actually press to "finish" a call regardless of how
    // it renders (sin( → ), abs( → |, floor( → ⌋, ceil( → ⌉), so it must match
    // any of those glyphs, not just a literal ')'. The other glyphs still match
    // themselves in case one is typed/pasted directly.
    const CLOSING_CHARS = new Set([')', '|', '⌋', '⌉']);
    if (CLOSING_CHARS.has(e.key)) {
      const skipSel = window.getSelection();
      if (skipSel && skipSel.rangeCount) {
        const sr = skipSel.getRangeAt(0);
        const aheadChar = sr.collapsed && sr.startContainer.nodeType === Node.TEXT_NODE
          ? sr.startContainer.textContent[sr.startOffset]
          : undefined;
        const matches = e.key === ')' ? CLOSING_CHARS.has(aheadChar) : aheadChar === e.key;
        if (matches) {
          e.preventDefault();
          const jump = document.createRange();
          jump.setStart(sr.startContainer, sr.startOffset + 1);
          jump.collapse(true);
          skipSel.removeAllRanges();
          skipSel.addRange(jump);
          return;
        }
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onMoveUp?.();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onMoveDown?.();
      return;
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const supEl = isInsideSup(sel.anchorNode);

    // Space in an empty top-level input: jump to next/new function row
    if (e.key === ' ' && !supEl) {
      if (!serializeInput(editorRef.current).trim()) {
        e.preventDefault();
        onMoveDown?.();
        return;
      }
    }

    if (e.key === ' ' && supEl) {
      e.preventDefault();
      exitSup(supEl);
      return;
    }

    // Unlike Space/ArrowRight (pure "exit" keys, nothing inserted), a comma
    // is meaningful content in its own right (e.g. the "x^2, 1<x<5" range
    // syntax) — it must exit the exponent AND still get typed, as a normal
    // (non-raised) character right after it.
    if (e.key === ',' && supEl) {
      e.preventDefault();
      exitSup(supEl);
      document.execCommand('insertText', false, ',');
      onChange(serializeInput(editorRef.current));
      return;
    }

    if (e.key === 'ArrowRight' && supEl) {
      const offset = sel.anchorOffset;
      const len = sel.anchorNode?.textContent?.length ?? 0;
      if (offset >= len) {
        e.preventDefault();
        exitSup(supEl);
      }
      return;
    }

    if (e.key === 'Backspace' && supEl) {
      // Content check (not offset) because a freshly-created sup carries a ZWSP
      // placeholder, so "empty" caret positions can be offset 0 or 1.
      const supContent = supEl.textContent.split(ZWSP).join('');
      if (supContent === '') {
        e.preventDefault();
        const parent = supEl.parentNode;
        const caretText = document.createTextNode('^');
        parent.insertBefore(caretText, supEl);
        supEl.remove();
        const r = document.createRange();
        r.setStart(caretText, 1);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        onChange(serializeInput(editorRef.current));
      }
    }
  }

  function handleInput() {
    const el = editorRef.current;
    if (!el) return;

    // Detect a freshly typed '^' and promote it to a <sup> element.
    // We do this in onInput (after the char is in the DOM) rather than
    // onKeyDown (before) because the Selection API is reliable here —
    // the cursor is positioned right after the '^' we want to replace.
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const container = range.startContainer;
      const offset = range.startOffset;

      // Exponents don't nest (no live '^' promotion while already inside a
      // sup), but function calls like x^abs(2) are common, so bracket-fn
      // detection below must NOT be gated on the same check.
      if (
        !isInsideSup(sel.anchorNode) &&
        container.nodeType === Node.TEXT_NODE &&
        container.parentNode &&
        offset > 0 &&
        container.textContent[offset - 1] === '^'
      ) {
        const text = container.textContent;
        const before = text.slice(0, offset - 1);
        const after = text.slice(offset);
        const parent = container.parentNode;

        const beforeNode = document.createTextNode(before);
        const sup = document.createElement('sup');
        const supText = document.createTextNode('');
        sup.appendChild(supText);
        const afterNode = document.createTextNode(after);

        parent.insertBefore(beforeNode, container);
        parent.insertBefore(sup, container);
        parent.insertBefore(afterNode, container);
        parent.removeChild(container);

        placeCaret(sel, supText, 0);

        onChange(serializeInput(el));
        return;
      }

      // Detect '(' typed right after a recognized function name → auto-close
      // and optionally replace the name with its Unicode symbol (e.g. sqrt → √).
      if (
        offset > 0 &&
        container.textContent[offset - 1] === '('
      ) {
        const textBefore = container.textContent.slice(0, offset - 1);
        const matchedFn = FN_NAMES.find((fn) => {
          if (!textBefore.endsWith(fn)) return false;
          // Ensure the character before the function name is not a letter/underscore
          // (prevents matching 'sin' inside 'mysin')
          const charBefore = textBefore[textBefore.length - fn.length - 1];
          return !charBefore || /[^a-zA-Z_]/.test(charBefore);
        });

        if (matchedFn) {
          const prefixLen = textBefore.length - matchedFn.length;
          const afterCursor = container.textContent.slice(offset);
          const bracket = FN_BRACKETS[matchedFn];

          if (bracket) {
            // Bracket notation: replace fnName( with open+close, cursor between them
            const { open, close } = bracket;
            container.textContent =
              textBefore.slice(0, prefixLen) + open + close + afterCursor;
            const cursorAt = prefixLen + open.length;
            const fr = document.createRange();
            fr.setStart(container, cursorAt);
            fr.collapse(true);
            sel.removeAllRanges();
            sel.addRange(fr);
          } else {
            // Paren notation: replace fnName with visual symbol, auto-close (), cursor inside
            const visual = FN_VISUALS[matchedFn] ?? matchedFn;
            container.textContent =
              textBefore.slice(0, prefixLen) + visual + '()' + afterCursor;
            const cursorAt = prefixLen + visual.length + 1;
            const fr = document.createRange();
            fr.setStart(container, cursorAt);
            fr.collapse(true);
            sel.removeAllRanges();
            sel.addRange(fr);
          }

          onChange(serializeInput(el));
          return;
        }
      }
    }

    onChange(serializeInput(el));
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    onChange(serializeInput(editorRef.current));
  }

  const borderClass = isValid ? 'border-outline/30' : 'border-red-400/70';

  return (
    <div className="relative flex-1">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Function expression"
        aria-multiline="false"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onPaste={handlePaste}
        className={`bg-surface-container-low border rounded-lg px-3 py-1.5 text-sm font-mono text-on-surface outline-none focus:border-primary/50 min-h-[2rem] leading-relaxed overflow-x-auto whitespace-nowrap ${borderClass}`}
      />
      {!value && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-on-surface-variant/40 pointer-events-none select-none">
          {placeholder}
        </span>
      )}
    </div>
  );
}
