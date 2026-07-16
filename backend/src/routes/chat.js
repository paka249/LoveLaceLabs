import { getProvider } from '../providers/index.js';
import { SYSTEM_PROMPT } from '../systemPrompt.js';

export function createChatHandler({ providerName }) {
  return async function chatHandler(req, res) {
    const { messages } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Request must include a non-empty "messages" array.' });
      return;
    }

    const provider = getProvider(providerName);
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
    } finally {
      res.end();
    }
  };
}
