import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createChatHandler } from './routes/chat.js';
import { createRateLimiter } from './rateLimiter.js';
import { createGoogleLoginHandler, createMeHandler, createLogoutHandler } from './routes/auth.js';
import { db } from './db/index.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Rate limiting below keys on req.ip, which assumes this server is not run behind
// a reverse proxy (Express's `trust proxy` is not enabled) - the client's real
// socket address is used directly, not a spoofable X-Forwarded-For header.
const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const chatRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
app.post('/api/chat', chatRateLimiter, createChatHandler({ providerName: process.env.AI_PROVIDER }));

app.post('/api/auth/google', createGoogleLoginHandler({ db }));
app.get('/api/auth/me', createMeHandler({ db }));
app.post('/api/auth/logout', createLogoutHandler());

await db.migrate.latest();

app.listen(PORT, () => {
  console.log(`Chatbot backend listening on http://localhost:${PORT}`);
});
