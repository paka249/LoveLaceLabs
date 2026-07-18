import { useEffect, useRef, useState } from 'react';

export function clampSize(size, min, max) {
  return {
    width: Math.min(Math.max(size.width, min.width), Math.max(max.width, min.width)),
    height: Math.min(Math.max(size.height, min.height), Math.max(max.height, min.height)),
  };
}

function getViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useResizable({ initialSize, minSize, position, onResizeEnd }) {
  const [size, setSize] = useState(initialSize);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const latestSizeRef = useRef(size);

  function handlePointerDown(e) {
    e.preventDefault();
    startRef.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return undefined;

    function handlePointerMove(e) {
      const viewport = getViewport();
      const maxSize = {
        width: viewport.width - position.x,
        height: viewport.height - position.y,
      };
      const next = clampSize(
        {
          width: startRef.current.width + (e.clientX - startRef.current.x),
          height: startRef.current.height + (e.clientY - startRef.current.y),
        },
        minSize,
        maxSize
      );
      latestSizeRef.current = next;
      setSize(next);
    }

    function handlePointerUp() {
      setIsResizing(false);
      onResizeEnd?.(latestSizeRef.current);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, minSize, position, onResizeEnd]);

  return { size, isResizing, handlePointerDown };
}
