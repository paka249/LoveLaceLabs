import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ChatPanel from './ChatPanel';

afterEach(() => {
  cleanup();
});

function renderPanel(overrides = {}) {
  const props = {
    position: { x: 0, y: 0 },
    messages: [],
    onSend: vi.fn(),
    isSending: false,
    error: null,
    onCollapse: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
  render(<ChatPanel {...props} />);
  return props;
}

describe('ChatPanel', () => {
  it('calls onSend with the typed text and clears the input', () => {
    const props = renderPanel();
    const input = screen.getByPlaceholderText('Ask Ada anything...');
    fireEvent.change(input, { target: { value: 'help with derivatives' } });
    fireEvent.click(screen.getByText('Send'));
    expect(props.onSend).toHaveBeenCalledWith('help with derivatives');
    expect(input.value).toBe('');
  });

  it('does not call onSend for an empty or whitespace-only message', () => {
    const props = renderPanel();
    const input = screen.getByPlaceholderText('Ask Ada anything...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Send'));
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('renders user and assistant messages', () => {
    renderPanel({
      messages: [
        { id: '1', role: 'user', content: 'hi' },
        { id: '2', role: 'assistant', content: 'hello!' },
      ],
    });
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByText('hello!')).toBeInTheDocument();
  });

  it('shows the error banner when error is set', () => {
    renderPanel({ error: 'Something went wrong.' });
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('calls onCollapse and onDismiss from the header buttons', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByTitle('Minimize'));
    expect(props.onCollapse).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('Remove chatbot'));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables the send button while a message is in flight', () => {
    renderPanel({ isSending: true, messages: [{ id: '1', role: 'user', content: 'hi' }] });
    expect(screen.getByText('Send')).toBeDisabled();
  });
});
