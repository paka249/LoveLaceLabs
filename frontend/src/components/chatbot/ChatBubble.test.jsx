import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ChatBubble from './ChatBubble';

function renderBubble(overrides = {}) {
  const props = {
    position: { x: 10, y: 20 },
    onPointerDown: vi.fn(),
    onOpen: vi.fn(),
    onDismiss: vi.fn(),
    hasMovedRef: { current: false },
    ...overrides,
  };
  render(<ChatBubble {...props} />);
  return props;
}

describe('ChatBubble', () => {
  afterEach(() => {
    cleanup();
  });
  it('calls onOpen when clicked without having dragged', () => {
    const props = renderBubble();
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not call onOpen when a drag occurred first', () => {
    const props = renderBubble({ hasMovedRef: { current: true } });
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it('calls onDismiss when the remove button is clicked', () => {
    const props = renderBubble();
    fireEvent.click(screen.getByTitle('Remove chatbot'));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('wires onPointerDown to the bubble for dragging', () => {
    const props = renderBubble();
    fireEvent.pointerDown(screen.getByTitle('Chat with Ada'));
    expect(props.onPointerDown).toHaveBeenCalledTimes(1);
  });
});
