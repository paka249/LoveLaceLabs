import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MARKDOWN_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

export default function ChatPanel({ position, messages, onSend, isSending, error, onCollapse, onDismiss }) {
  const [draft, setDraft] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div
      style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 1000 }}
      className="w-80 h-[420px] flex flex-col rounded-2xl border border-primary/25 bg-surface-container-low/95 backdrop-blur-md overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-outline/20">
        <span className="text-sm font-bold text-primary">Ada</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCollapse} title="Minimize" className="text-on-surface-variant hover:text-primary cursor-pointer">
            _
          </button>
          <button type="button" onClick={onDismiss} title="Remove chatbot" className="text-on-surface-variant hover:text-red-400 cursor-pointer">
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'ml-6 rounded-lg bg-primary/15 px-2 py-1'
                : 'mr-6 rounded-lg bg-surface-container-high px-2 py-1 chat-markdown'
            }
          >
            {message.content ? (
              <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                {message.content}
              </ReactMarkdown>
            ) : (
              message.role === 'assistant' && isSending ? '…' : ''
            )}
          </div>
        ))}
        {error && <div className="mr-6 rounded-lg bg-red-500/15 text-red-400 px-2 py-1">{error}</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t border-outline/20">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Ada anything..."
          className="flex-1 bg-transparent border border-outline/30 rounded-lg px-2 py-1 text-sm outline-none focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="text-primary disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
