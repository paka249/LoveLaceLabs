import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createChatHandler } from './routes/chat.js';
import { createRateLimiter } from './rateLimiter.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

const chatRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
app.post('/api/chat', chatRateLimiter, createChatHandler({ providerName: process.env.AI_PROVIDER }));

app.listen(PORT, () => {
  console.log(`Chatbot backend listening on http://localhost:${PORT}`);
});
