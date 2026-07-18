# Ada Chat History & Full-Screen Mode — Design

## Summary

Today Ada's conversation lives only in the browser's `localStorage` — one
continuous thread, gone if storage is cleared, invisible to the backend. This
adds server-side persistence for multiple named conversations per user, plus a
full-screen mode that gives Ada a ChatGPT-style layout (conversation sidebar +
active thread) once there's actually history worth browsing. The floating
bubble/panel widget keeps its current single-thread, minimal-chrome behavior
unchanged; full-screen is where history lives.

## Scope

In scope for this pass:
- SQLite-backed storage for conversations and messages, via a query-builder
  layer (Knex) chosen so swapping to Postgres later is a config change, not a
  rewrite.
- Anonymous per-browser identity (a client-generated UUID), with the schema
  shaped so a future real login system can attach to the same `users.id`
  without a migration that touches `conversations`/`messages`.
- Full CRUD for conversations (create, list, fetch messages, delete) scoped to
  the requesting user.
- `POST /api/chat` becomes server-authoritative: client sends only the new
  message, server reloads history from the DB before prompting the AI
  provider.
- A full-screen mode: sidebar of past conversations (switch, new chat,
  delete) + the active thread, reusing the existing markdown/KaTeX message
  rendering.
- An expand affordance on the windowed panel to enter full-screen.

Explicitly out of scope for this pass (follow-up work):
- Real accounts / login UI (email+password, OAuth). The schema supports it;
  no UI ships for it here.
- Multi-device sync for a given person (anonymous ID is per-browser; clearing
  storage loses access to that history — accepted limitation, not solved
  here).
- Renaming conversations, search/filter across history, pagination for users
  with very many conversations.
- Actually swapping to Postgres — this pass only ensures the swap is cheap
  later, it doesn't perform it.

## Architecture

### Data model (SQLite via Knex)

```
users
  id          text primary key   -- client-generated UUID today; a future
                                  -- login system attaches real credentials
                                  -- to this same id, no schema change needed
  created_at  timestamp

conversations
  id          text primary key
  user_id     text  -> users.id
  title       text, nullable      -- auto-filled from the first message
  created_at  timestamp
  updated_at  timestamp

messages
  id               text primary key
  conversation_id  text -> conversations.id
  role             text check in ('user', 'assistant')
  content          text
  created_at       timestamp
```

Knex over Prisma/Drizzle: it's a query builder, not a code-gen ORM, which
fits this backend's existing style of small hand-written modules (the
provider registry, the hand-rolled rate limiter). The same
`knex('messages').insert(...)` calls run unchanged against SQLite or
Postgres — moving later is a config change (`client: 'better-sqlite3'` →
`client: 'pg'`, new connection string), not a rewrite. Knex also ships a
real migration system (versioned files under `backend/migrations/`), which
is worth having regardless of which database ends up in production.

### Identity

The client generates a random UUID on first load and persists it in
`localStorage` under `chatbot:userId` (new `useUserId.js` hook, same shape as
the existing `usePersistedState.js`). Every request to the backend includes
it as an `X-User-Id` header. The backend auto-provisions a `users` row for
any ID it hasn't seen — there's no explicit signup call. This is the exact
seam a future login system replaces: swap "generate a random UUID" for
"UUID from a real authenticated session," and nothing in the schema, the
conversations/messages tables, or the ownership checks below has to change.

### Backend API (`backend/src/routes/`)

New, all scoped by the requesting `X-User-Id`:

| Route | Behavior |
|---|---|
| `POST /api/conversations` | Creates a conversation for this user. Returns `{ id, title: null, createdAt }`. |
| `GET /api/conversations` | Lists this user's conversations, newest first: `[{ id, title, updatedAt }]`. |
| `GET /api/conversations/:id/messages` | Returns `[{ id, role, content, createdAt }]` for that conversation. `404` if it doesn't exist or belongs to a different user (not `403` — existence isn't leaked). |
| `DELETE /api/conversations/:id` | Deletes the conversation and its messages. Same ownership check as above. |

`POST /api/chat` changes shape. Today the client resends the full message
array every time — that pattern is directly responsible for the last two
chatbot bugfixes (stale/empty messages getting replayed into the next
request). Going forward:

- Request body becomes `{ conversationId, content }` — just the new user
  message. `conversationId` is optional; if omitted, the server creates a
  conversation first, auto-titled from the first ~40 characters of `content`.
- The server appends the user message to `messages`, reloads the full
  conversation history from SQLite (not from the request body), and prompts
  the AI provider with that.
- The reply streams back exactly as it does today (plain text chunks, same
  wire format). If a conversation was just auto-created, its id is returned
  via an `X-Conversation-Id` response header, set before the streaming body
  starts, so the client can pick it up without changing the streaming
  contract.
- Once the stream completes, the full assistant reply is persisted as a
  `messages` row.

Existing role validation, rate limiting, and CORS restrictions are unchanged.

### Frontend (`frontend/src/components/chatbot/`)

- **`useUserId.js`** (new) — generates and persists the anonymous UUID, same
  pattern as `usePersistedState.js`.
- **`chatApi.js`** — gains `listConversations`, `createConversation`,
  `deleteConversation`, `getMessages`. `sendChatMessage` changes signature
  from `(messages, { onChunk })` to `({ conversationId, content }, { onChunk, onConversationId })`.
- **`MessageList.jsx`** (new) — the message-rendering logic (ReactMarkdown +
  remark-math + rehype-katex, currently inline in `ChatPanel.jsx`) extracted
  into its own component so the windowed panel and full-screen mode render
  messages identically without duplicating that logic.
- **`ChatbotWidget.jsx`** — gains a third render mode alongside
  bubble/windowed: **full-screen**. Tracks `activeConversationId`, persisted
  via `usePersistedState('chatbot:activeConversationId', null)` — this
  replaces today's `chatbot:messages` key as the thing that gives windowed
  mode continuity across reloads. On mount, if an id is stored, its messages
  are fetched from the server (`GET /api/conversations/:id/messages`) instead
  of reading a raw message array out of `localStorage`; the array itself is
  no longer persisted client-side now that the server is the source of
  truth. Entering full-screen always starts on that same active conversation
  (or the most recent one, or a fresh one if none exist yet).
- **`ChatFullScreen.jsx`** (new) — fixed, full-viewport overlay. Left
  sidebar: "New chat" button + conversation list (title, relative timestamp,
  delete). Right side: `MessageList` for the active conversation + the input
  box. No drag/resize — it's a fixed overlay, not a floating window.
- **`ChatPanel.jsx`** — gains an expand button next to minimize/dismiss that
  switches to full-screen. Drag and resize behavior (recently added) is
  unchanged for windowed mode.
- Full-screen is not a persisted UI state — leaving it (collapse or dismiss)
  always returns to the bubble, consistent with the existing "restoring Ada
  always lands on the avatar bubble" behavior. No new persisted-state edge
  cases to reason about.

## Data flow

1. On first load, the frontend generates (or reads) `chatbot:userId` and
   sends it as `X-User-Id` on every request from then on.
2. **Windowed mode** (unchanged from today's UX): user opens the bubble,
   sends a message. If there's no active conversation yet, one is created
   implicitly on the first `POST /api/chat` call. Reply streams in as it
   does today.
3. **Entering full-screen**: `GET /api/conversations` populates the sidebar;
   the most recent conversation's messages load via
   `GET /api/conversations/:id/messages`.
4. **Switching conversations** in full-screen: fetch that conversation's
   messages, replace the active thread.
5. **New chat** in full-screen: clears the active thread client-side; the
   next message sent creates the conversation server-side (same implicit-
   create path as windowed mode).
6. **Deleting** a conversation: `DELETE /api/conversations/:id`, removed from
   the sidebar list; if it was the active conversation, falls back to the
   next most recent (or a fresh empty thread if none remain).

## Error handling

- Conversation creation failing is fatal to that request (`500`) — there's
  no coherent place to attach the reply. Surfaced the same way existing chat
  errors are today (inline error message in the thread).
- A single message-row persist failure *after* a successful stream is logged
  server-side but doesn't fail the response the user already saw — the reply
  already rendered; losing it from history on a transient DB hiccup would be
  a worse experience than a gap in persisted history.
- Fetching messages for a conversation that doesn't exist (deleted from
  another tab, bad id) → `404`, frontend falls back to the conversation list.
- Lost anonymous ID (storage cleared) → indistinguishable from a brand-new
  user; this is the accepted limitation of the anonymous-now model, not
  treated as an error state.

## Testing

- **Backend**: new `node --test` files under `backend/test/`, matching the
  existing convention (`chat.route.test.js`, `providers.test.js`, etc.) —
  coverage for the conversations CRUD routes, ownership checks (404 on
  cross-user access), and the updated `POST /api/chat` persistence flow, run
  against a temporary SQLite file per test run.
- **Frontend**: Vitest, matching `ChatPanel.test.jsx`/`ChatbotWidget.test.jsx`
  conventions — new tests for `useUserId`, `ChatFullScreen`, `MessageList`,
  and the updated `chatApi` functions (mocked fetch, as `chatApi.test.js`
  already does).

## Open questions for later (not blocking this pass)

- Whether to cap or paginate the conversation list for a user with a very
  long history.
- Whether/when to build the real login system this schema is designed to
  accept.
- Whether the anonymous `users` row should ever be garbage-collected (e.g.
  abandoned browsers with zero conversations).
