import { getProvider } from '../providers/index.js';
import { SYSTEM_PROMPT } from '../systemPrompt.js';

const ALLOWED_ROLES = new Set(['user', 'assistant']);

function isValidMessage(message) {
  return (
    message !== null &&
    typeof message === 'object' &&
    ALLOWED_ROLES.has(message.role) &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
  );
}

export function createChatHandler({ providerName, resolveProvider = getProvider }) {
  return async function chatHandler(req, res) {
    const { messages } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isValidMessage)) {
      res.status(400).json({
        error: 'Request must include a non-empty "messages" array of { role: "user"|"assistant", content: string } objects.',
      });
      return;
    }

    const provider = resolveProvider(providerName);
    if (!provider) {
      res.status(503).json({
        error: "I'm not set up with an AI provider yet - ask your developer to configure AI_PROVIDER.",
      });
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    try {
      for await (const chunk of provider.stream(messages, SYSTEM_PROMPT)) {
        res.write(chunk);
      }
    } catch (err) {
      console.error('Error while streaming chat response:', err);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ error: 'Something went wrong while generating a response.' });
      } else {
        res.write('\n\n[Error: response interrupted]');
      }
    } finally {
      res.end();
    }
  };
}
