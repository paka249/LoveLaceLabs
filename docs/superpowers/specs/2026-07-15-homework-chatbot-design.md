# Homework Chatbot Widget — Design

## Summary

A floating, draggable chatbot widget ("Ada") that lives on top of every page of the
app. Closed state is a small mascot bubble the user can drag anywhere on screen or
dismiss with an X; clicking it opens a chat panel. The bot answers homework
questions via a real AI API call (provider not yet chosen) and can explain how to
use the app's own features conversationally, using knowledge baked into its system
prompt — no separate "site guidance" subsystem.

## Scope

In scope for this first prototype:
- Draggable/dismissible bubble + chat panel (frontend)
- Minimal backend proxying chat messages to an LLM, streamed back to the client
- Position, open/closed state, and message history persisted via localStorage
- Basic per-IP rate limiting on the backend
- Sidebar entry to re-summon the widget after it's been dismissed

Explicitly out of scope for this pass (can be follow-up specs):
- Wiring a specific AI provider's real API key/billing (provider is abstracted
  behind an interface; ships with a "not configured" state until a key is added)
- Awareness of the calculator's current input/expression (bot is a fully separate
  conversation)
- Any UI spotlighting/highlighting or bot-driven navigation of the app
- User accounts, multi-device sync, or server-side conversation storage

## Architecture

### Frontend — `frontend/src/components/chatbot/`

Mirrors the existing `components/dashboard/` convention. Mounted once in
`App.jsx`, as a sibling to `Sidebar`/`main`, so it renders above every page
regardless of route.

- **`ChatbotWidget.jsx`** — top-level owner of position and open/closed state.
  Renders `ChatBubble` when closed, `ChatPanel` when open.
- **`ChatBubble.jsx`** — the closed mascot bubble. Draggable via pointer events,
  click opens the panel, small X dismisses it (setting open-state to a distinct
  "dismissed" value so the Sidebar knows to show the re-summon entry).
- **`ChatPanel.jsx`** — the open conversation view: scrollable message list, text
  input, send button. Anchored near the bubble's last position, clamped so the
  panel itself never renders off-screen.
- **`useDraggable.js`** — reusable pointer-drag hook. Tracks `{x, y}`, clamps to
  viewport bounds on every move so the widget can't be dragged off-screen or
  lost behind the sidebar.
- **`usePersistedState.js`** — small `useState` wrapper backed by `localStorage`,
  used for position, open/closed/dismissed state, and message history.
- **`chatApi.js`** — client for `POST /api/chat`. Sends the full message history,
  reads the response as a stream and yields text chunks as they arrive.

### Backend — `backend/`

New minimal Express server, sibling to `frontend/`.

- **`POST /api/chat`** — accepts `{ messages: [...] }`, returns a streamed text
  response (chunked transfer / SSE — implementation detail decided during
  planning).
- **Provider interface** — `providers/index.js` exports `sendMessage(messages)`
  returning an async iterable of text chunks. `providers/anthropic.js` and
  `providers/openai.js` implement it; the active one is chosen by an
  `AI_PROVIDER` env var. If no provider is configured, the endpoint returns a
  clear `503` with a "not configured" message rather than crashing.
- **System prompt** — defines Ada's persona (friendly, concise, homework-helper
  tone) plus a description of the app's own features (calculator tabs, matrix
  operations, etc.) so it can answer "how do I..." questions about the site
  itself conversationally.
- **Rate limiting** — simple in-memory per-IP sliding-window limiter (e.g.
  `express-rate-limit`) to prevent runaway API costs. Exceeding it returns
  `429`.
- **CORS** — configured for local dev (frontend on Vite's port, backend on its
  own).
- **`.env`** (gitignored) — holds provider API key(s); `.env.example` documents
  the expected variables.

## Data flow

1. User drags the bubble → position persisted to `localStorage` on release.
2. User clicks the bubble → panel opens, message history restored from
   `localStorage`.
3. User sends a message → optimistically appended to the visible list → POSTed
   to the backend with full history → backend calls the configured AI provider
   → text streams back and is appended live to the bot's in-progress message →
   once complete, full conversation (including the new exchange) is persisted.
4. User clicks X → panel/bubble hide, state marked dismissed → a "Chatbot" entry
   appears in the `Sidebar`; clicking it restores the bubble at its last saved
   position.

## Error handling

- Backend unreachable (network failure) → inline chat message: "Sorry, I
  couldn't reach my brain right now — try again in a moment." No crash, input
  stays usable.
- No AI provider configured (`503` from backend) → distinct inline system
  message explaining the bot isn't set up yet. Expected during early
  development before a provider/key is chosen.
- Rate limit exceeded (`429`) → inline message: "Slow down, you've sent a lot
  of messages — try again in a minute."
- Drag/position → clamped continuously during drag, so there is no invalid
  persisted position to recover from.

## Testing

- **Frontend**: unit tests for the drag-clamping math in `useDraggable` and for
  `usePersistedState`'s read/write/fallback behavior. Streaming message-append
  logic tested against a mocked chunked response.
- **Backend**: unit tests for provider selection (env-var driven) and the rate
  limiter, using a mocked provider — no real API calls in tests/CI.

## Open questions for later (not blocking this prototype)

- Which AI provider/model to actually configure (and its cost budget).
- Whether conversation history should ever be capped/pruned for very long
  sessions (localStorage size).
