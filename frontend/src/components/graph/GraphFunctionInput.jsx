import { useLayoutEffect, useRef } from 'react';
import { serializeInput, deserializeToHtml } from './graphInputUtils';

export default function GraphFunctionInput({ value, onChange, placeholder, isValid, onAddFunction }) {
  const editorRef = useRef(null);

  // Initialize innerHTML exactly once on mount. After that the browser owns the DOM;
  // we only emit via onChange. Syncing on every value change fights contenteditable
  // and causes the caret/sup to disappear during React's effect cycle.
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el || !value) return;
    el.innerHTML = deserializeToHtml(value);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function isInsideSup(node) {
    let cur = node;
    while (cur && cur !== editorRef.current) {
      if (cur.nodeName === 'SUP') return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  function insertSup() {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement !== el) el.focus();

    // execCommand('insertHTML') inserts at the caret and correctly places the
    // cursor after the inserted fragment. range.insertNode puts the cursor
    // BEFORE the node per spec, causing typed characters to land outside the sup.
    const uid = `sup-${Date.now()}`;
    document.execCommand('insertHTML', false, `<sup data-uid="${uid}"></sup>`);

    const supEl = el.querySelector(`sup[data-uid="${uid}"]`);
    if (!supEl) return;
    supEl.removeAttribute('data-uid');

    const textNode = document.createTextNode('');
    supEl.appendChild(textNode);

    if (!supEl.nextSibling || supEl.nextSibling.nodeType !== Node.TEXT_NODE) {
      supEl.after(document.createTextNode(''));
    }

    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.setStart(textNode, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }

    onChange(serializeInput(el));
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
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddFunction?.();
      return;
    }

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
        className={`bg-surface-container-low border rounded-lg px-3 py-1.5 text-sm font-mono text-on-surface outline-none focus:border-primary/50 min-h-[2rem] leading-relaxed [&_sup]:align-super [&_sup]:text-[0.75em] ${borderClass}`}
      />
      {!value && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-on-surface-variant/40 pointer-events-none select-none">
          {placeholder}
        </span>
      )}
    </div>
  );
}
