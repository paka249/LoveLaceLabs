import { useState } from 'react';
import { generateId } from '../../utils/mathTree';
import { usePersistedState } from './usePersistedState';
import { useDraggable } from './useDraggable';
import { sendChatMessage, ChatApiError } from './chatApi';
import ChatBubble from './ChatBubble';
import ChatPanel from './ChatPanel';

const BUBBLE_SIZE = { width: 56, height: 76 };
const PANEL_SIZE = { width: 320, height: 420 };
const DEFAULT_POSITION = { x: 24, y: 120 };

export default function ChatbotWidget({ dismissed, onDismiss }) {
  const [position, setPosition] = usePersistedState('chatbot:position', DEFAULT_POSITION);
  const [panelOpen, setPanelOpen] = usePersistedState('chatbot:panelOpen', false);
  const [messages, setMessages] = usePersistedState('chatbot:messages', []);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const { position: dragPosition, handlePointerDown, hasMovedRef } = useDraggable({
    initialPosition: position,
    size: panelOpen ? PANEL_SIZE : BUBBLE_SIZE,
    onDragEnd: setPosition,
  });

  if (dismissed) return null;

  async function handleSend(text) {
    const userMessage = { id: generateId(), role: 'user', content: text };
    const botMessageId = generateId();
    const history = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage, { id: botMessageId, role: 'assistant', content: '' }]);
    setError(null);
    setIsSending(true);

    try {
      await sendChatMessage(history, {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botMessageId ? { ...m, content: m.content + chunk } : m))
          );
        },
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== botMessageId));
      if (err instanceof ChatApiError && err.status === 503) {
        setError("I'm not set up with an AI provider yet — ask your developer to configure one.");
      } else if (err instanceof ChatApiError && err.status === 429) {
        setError("Slow down, you've sent a lot of messages — try again in a minute.");
      } else {
        setError("Sorry, I couldn't reach my brain right now — try again in a moment.");
      }
    } finally {
      setIsSending(false);
    }
  }

  if (panelOpen) {
    return (
      <ChatPanel
        position={dragPosition}
        messages={messages}
        onSend={handleSend}
        isSending={isSending}
        error={error}
        onCollapse={() => setPanelOpen(false)}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <ChatBubble
      position={dragPosition}
      onPointerDown={handlePointerDown}
      onOpen={() => setPanelOpen(true)}
      onDismiss={onDismiss}
      hasMovedRef={hasMovedRef}
    />
  );
}
