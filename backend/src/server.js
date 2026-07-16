import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createChatHandler } from './routes/chat.js';
import { createRateLimiter } from './rateLimiter.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Rate limiting below keys on req.ip, which assumes this server is not run behind
// a reverse proxy (Express's `trust proxy` is not enabled) - the client's real
// socket address is used directly, not a spoofable X-Forwarded-For header.
const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

const chatRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
app.post('/api/chat', chatRateLimiter, createChatHandler({ providerName: process.env.AI_PROVIDER }));

app.listen(PORT, () => {
  console.log(`Chatbot backend listening on http://localhost:${PORT}`);
});
