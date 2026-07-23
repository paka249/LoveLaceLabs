import { useLayoutEffect, useRef } from 'react';
import { serializeInput, deserializeToHtml, ZWSP } from './graphInputUtils';

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
    if (sel && sel.rangeCount && !isInsideSup(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const container = range.startContainer;
      const offset = range.startOffset;

      if (
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
