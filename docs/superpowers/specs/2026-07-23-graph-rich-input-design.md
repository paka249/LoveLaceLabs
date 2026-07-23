# Graph Rich Input & Color Picker Design

**Date:** 2026-07-23
**Branch:** feat/graph

## Summary

Two enhancements to the graph function panel:
1. Live superscript editing in function rows — typing `^` moves the cursor into a `<sup>` element so exponents render inline while you type.
2. A clickable color dot that opens the OS color picker to let users pick any color manually.

## Scope

- New component: `src/components/graph/GraphFunctionInput.jsx`
- Modified: `src/components/graph/FunctionList.jsx` (swap `<input>` for `GraphFunctionInput`, wire color picker)
- No changes to `graphEvaluator.js`, `GraphCanvas.jsx`, or `Graph.jsx`

---

## 1. `GraphFunctionInput` Component

Replaces the plain `<input type="text">` in each function row.

### Rendering

A styled `contenteditable` div that visually matches the current input (same border, font, rounded corners, error state). Superscripts are rendered as native HTML `<sup>` elements.

### Keyboard Behavior

| Key | Context | Action |
|-----|---------|--------|
| `^` | Main text | Prevent default; insert `<sup>` at caret; move cursor inside it |
| Space | Inside `<sup>` | Prevent default; exit `<sup>`; cursor continues in main text |
| ArrowRight (at end of `<sup>`) | Inside `<sup>` | Exit `<sup>`; cursor continues in main text |
| Backspace (at start of `<sup>`) | Inside `<sup>` | Remove `<sup>` node entirely; insert `^` in its place in main text |
| Enter | Anywhere | No-op (graph updates on every keystroke) |

### Serializer (DOM → string)

Called on every `input` event. Walks `childNodes`:
- `Text` node → append `.textContent`
- `<sup>` → append `^` + inner text content
- Output is the plain expression string passed to `onChange`

### Deserializer (string → DOM)

Called on mount and when `value` changes externally (e.g. reset). Parses the plain string into DOM:
- Splits on `^...` segments using a regex
- Reconstructs text nodes and `<sup>` elements
- Text segments are HTML-escaped before inserting into `<sup>` or bare text nodes
- Uses `innerHTML` assignment (safe: only escaped text and `<sup>` tags written)

### Props

```js
{
  value: string,           // plain expression, e.g. "x^2+1"
  onChange: (string) => void,
  placeholder: string,
  isValid: bool,           // controls error border
  color: string,           // used for cursor/caret accent color
}
```

### Error border

Same logic as current `FunctionList`: red border when `isValid(value)` is false.

---

## 2. Color Picker

In `FunctionList`, the color dot `<span>` becomes a `<button>` wrapping a visually-hidden `<input type="color">`. Clicking the button programmatically triggers `.click()` on the hidden input. `onChange` on the color input fires `handleColorChange(id, e.target.value)`, which updates `fn.color` in the functions array.

No extra state needed — the color is already stored in each function object.

---

## Testing

- Unit tests for serializer and deserializer functions (pure, easy to test)
- `GraphFunctionInput` render test: renders a contenteditable div
- Color picker test: clicking the dot fires onChange with the new color hex
- Existing `FunctionList` and `GraphCanvas` tests must continue to pass unchanged
