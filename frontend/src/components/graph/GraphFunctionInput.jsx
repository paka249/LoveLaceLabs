import { useEffect, useRef } from 'react';
import { serializeInput, deserializeToHtml } from './graphInputUtils';

export default function GraphFunctionInput({ value, onChange, placeholder, isValid }) {
  const editorRef = useRef(null);

  // Sync external value changes to DOM without fighting user edits
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const current = serializeInput(el);
    if (current !== value) {
      // deserializeToHtml only produces <sup> tags with HTML-escaped content — safe to set
      el.innerHTML = deserializeToHtml(value);
    }
  }, [value]);

  function isInsideSup(node) {
    let cur = node;
    while (cur && cur !== editorRef.current) {
      if (cur.nodeName === 'SUP') return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  function insertSup() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();

    const sup = document.createElement('sup');
    const textNode = document.createTextNode('');
    sup.appendChild(textNode);
    range.insertNode(sup);

    // Ensure there is a text node after the sup to exit into
    if (!sup.nextSibling || sup.nextSibling.nodeType !== Node.TEXT_NODE) {
      sup.after(document.createTextNode(''));
    }

    const newRange = document.createRange();
    newRange.setStart(textNode, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    onChange(serializeInput(editorRef.current));
  }

  function exitSup(supEl) {
    const sel = window.getSelection();
    if (!sel) return;
    let afterNode = supEl.nextSibling;
    if (!afterNode || afterNode.nodeType !== Node.TEXT_NODE) {
      afterNode = document.createTextNode('');
      supEl.after(afterNode);
    }
    const newRange = document.createRange();
    newRange.setStart(afterNode, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  function handleKeyDown(e) {
    if (e.key === '^') {
      e.preventDefault();
      insertSup();
      return;
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const supEl = isInsideSup(sel.anchorNode);

    if (e.key === ' ' && supEl) {
      e.preventDefault();
      exitSup(supEl);
      return;
    }

    if (e.key === 'ArrowRight' && supEl) {
      const offset = sel.anchorOffset;
      const len = sel.anchorNode?.textContent?.length ?? 0;
      if (offset >= len) {
        e.preventDefault();
        exitSup(supEl);
      }
      // early return is safe — no later branch in this handler matches ArrowRight
      return;
    }

    if (e.key === 'Backspace' && supEl) {
      if (sel.anchorOffset === 0 && sel.focusOffset === 0) {
        e.preventDefault();
        const parent = supEl.parentNode;
        const caretText = document.createTextNode('^');
        parent.insertBefore(caretText, supEl);
        supEl.remove();
        const newRange = document.createRange();
        newRange.setStart(caretText, 1);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        onChange(serializeInput(editorRef.current));
      }
    }
  }

  function handleInput() {
    onChange(serializeInput(editorRef.current));
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
        className={`bg-surface-container-low border rounded-lg px-3 py-1.5 text-sm font-mono text-on-surface outline-none focus:border-primary/50 min-h-[2rem] leading-relaxed ${borderClass}`}
      />
      {!value && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-on-surface-variant/40 pointer-events-none select-none">
          {placeholder}
        </span>
      )}
    </div>
  );
}
