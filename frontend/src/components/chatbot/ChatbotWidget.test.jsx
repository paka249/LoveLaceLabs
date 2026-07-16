import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ChatbotWidget from './ChatbotWidget';
import * as chatApi from './chatApi';

describe('ChatbotWidget', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when dismissed', () => {
    const { container } = render(<ChatbotWidget dismissed={true} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the bubble by default when not dismissed', () => {
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    expect(screen.getByTitle('Chat with Ada')).toBeInTheDocument();
  });

  it('opens the panel when the bubble is clicked', () => {
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    expect(screen.getByPlaceholderText('Ask Ada anything...')).toBeInTheDocument();
  });

  it('calls onDismiss when dismissed from the bubble', () => {
    const onDismiss = vi.fn();
    render(<ChatbotWidget dismissed={false} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTitle('Remove chatbot'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('sends a message and appends streamed chunks to the assistant reply', async () => {
    vi.spyOn(chatApi, 'sendChatMessage').mockImplementation(async (messages, { onChunk }) => {
      onChunk('Hello ');
      onChunk('there!');
    });
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    fireEvent.change(screen.getByPlaceholderText('Ask Ada anything...'), { target: { value: 'help me' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('help me')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Hello there!')).toBeInTheDocument());
  });

  it('shows a friendly message when the provider is not configured (503)', async () => {
    vi.spyOn(chatApi, 'sendChatMessage').mockRejectedValue(new chatApi.ChatApiError('not configured', 503));
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    fireEvent.change(screen.getByPlaceholderText('Ask Ada anything...'), { target: { value: 'help me' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText(/not set up with an AI provider/)).toBeInTheDocument();
  });

  it('shows a friendly message when rate limited (429)', async () => {
    vi.spyOn(chatApi, 'sendChatMessage').mockRejectedValue(new chatApi.ChatApiError('rate limited', 429));
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    fireEvent.change(screen.getByPlaceholderText('Ask Ada anything...'), { target: { value: 'help me' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText(/Slow down/)).toBeInTheDocument();
  });

  it('removes the empty assistant placeholder from history after an error, so it is not sent on the next message', async () => {
    vi.spyOn(chatApi, 'sendChatMessage').mockRejectedValueOnce(new chatApi.ChatApiError('boom', 500));
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    fireEvent.change(screen.getByPlaceholderText('Ask Ada anything...'), { target: { value: 'first message' } });
    fireEvent.click(screen.getByText('Send'));

    await screen.findByText(/couldn't reach my brain/);
    expect(screen.getByText('first message')).toBeInTheDocument();

    vi.spyOn(chatApi, 'sendChatMessage').mockImplementationOnce(async (messages, { onChunk }) => {
      expect(messages.some((m) => m.role === 'assistant')).toBe(false);
      onChunk('ok');
    });
    fireEvent.change(screen.getByPlaceholderText('Ask Ada anything...'), { target: { value: 'second message' } });
    fireEvent.click(screen.getByText('Send'));
    await screen.findByText('ok');
  });
});
