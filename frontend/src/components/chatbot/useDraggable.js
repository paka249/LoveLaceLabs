import { useEffect, useRef, useState } from 'react';

export function clampPosition(position, size, viewport) {
  const maxX = Math.max(0, viewport.width - size.width);
  const maxY = Math.max(0, viewport.height - size.height);
  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, 0), maxY),
  };
}

function getViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useDraggable({ initialPosition, size, onDragEnd }) {
  const [position, setPosition] = useState(() => clampPosition(initialPosition, size, getViewport()));
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const latestPositionRef = useRef(position);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    setPosition((prev) => {
      const next = clampPosition(prev, size, getViewport());
      latestPositionRef.current = next;
      return next;
    });
  }, [size]);

  function handlePointerDown(e) {
    e.preventDefault();
    hasMovedRef.current = false;
    dragOffsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return undefined;

    function handlePointerMove(e) {
      hasMovedRef.current = true;
      const next = clampPosition(
        { x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y },
        size,
        getViewport()
      );
      latestPositionRef.current = next;
      setPosition(next);
    }

    function handlePointerUp() {
      setIsDragging(false);
      onDragEnd?.(latestPositionRef.current);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, size, onDragEnd]);

  return { position, isDragging, handlePointerDown, hasMovedRef };
}
