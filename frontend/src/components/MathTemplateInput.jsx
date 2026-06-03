import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * MathTemplateInput
 *
 * A single styled <input> primitive shared by every structured template field
 * (fraction, sigma, product, integral, limit, etc.).
 *
 * Props:
 *   size        - 'xs' | 'sm' | 'md' | 'lg'   (default: 'md')
 *   isActive    - bool  whether this field is the currently-focused template field
 *                       (controls border brightness)
 *   activeCaret - number/null position of selection caret
 *   className   - additional classes appended after the base classes
 *   ...rest     - all native <input> props (value, onChange, onKeyDown, placeholder, etc.)
 *
 * All refs are forwarded so callers can imperatively focus / set selection.
 */
const SIZE_MAP = {
  xs: 'h-7  min-w-[2rem]  text-[13px] px-1',
  sm: 'h-8  min-w-[2.5rem] text-[14px] px-1.5',
  md: 'h-9  min-w-[3rem]  text-[16px] px-2',
  lg: 'h-10 min-w-[5rem]  text-[18px] px-2',
};

const MathTemplateInput = forwardRef(function MathTemplateInput(
  { size = 'md', isActive = false, activeCaret = null, className = '', ...rest },
  ref,
) {
  const sizeClasses = SIZE_MAP[size] ?? SIZE_MAP.md;
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => inputRef.current);

  useEffect(() => {
    if (isActive && inputRef.current) {
      if (document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
      if (activeCaret !== null && activeCaret !== undefined) {
        if (inputRef.current.selectionStart !== activeCaret) {
          inputRef.current.setSelectionRange(activeCaret, activeCaret);
        }
      }
    }
  }, [isActive, activeCaret]);

  const borderClasses = isActive
    ? 'border-primary shadow-[0_0_8px_rgba(90,240,179,0.35)]'
    : 'border-primary/40 hover:border-primary/70';

  return (
    <input
      ref={inputRef}
      {...rest}
      className={[
        // Layout & shape
        'rounded-md',
        // Sizing (from size prop)
        sizeClasses,
        // Background
        'bg-surface-container-low/40',
        // Border — 2px, colour driven by isActive
        'border-2',
        borderClasses,
        // Typography
        'font-mono text-primary text-center',
        // Focus ring suppression (we use the border highlight instead)
        'outline-none focus:outline-none focus:ring-0',
        // Smooth transitions
        'transition-[border-color,box-shadow] duration-150',
        // Caller overrides
        className,
      ].join(' ')}
    />
  );
});

export default MathTemplateInput;
