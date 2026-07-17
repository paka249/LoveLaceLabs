# Ada Chatbot — How It Works

This explains the chatbot widget end to end: what each piece does, how a message
actually gets from the input box to a real answer, and how the AI integration
works. Written for whoever's picking this up next (including future-you).

## Is this RAG?

**No.** RAG (retrieval-augmented generation) means looking up relevant documents
from some knowledge base and inserting them into the prompt before the model
answers. There is no document store, no vector database, no retrieval step
anywhere in this codebase.

What Ada actually does is much simpler: every request bundles the conversation
with one fixed **system prompt** (`backend/src/systemPrompt.js`) that tells
Gemini "you are Ada, a homework helper embedded in this calculator app, explain
your reasoning." That's it. If Ada stays on-topic, that's Gemini's own
instruction-following responding to that framing — not a keyword filter or
topic classifier in this code. The only actual guardrail against someone
overriding those instructions is that the backend rejects any client-supplied
message with `role: "system"` (see "Security notes" below) — everything else
about staying on-topic is the model's own behavior, not enforced by this app.

## The big picture

```
Browser (React)                    Node/Express backend              Gemini API
────────────────                   ──────────────────                ──────────
ChatbotWidget                      POST /api/chat
  ├─ drag position                   ├─ rate limiter (per IP)
  ├─ open/closed state               ├─ validate messages
  ├─ message history                 ├─ pick provider (env var)
  │  (all 3 in localStorage)         └─ provider.stream(...)  ────▶  streamGenerateContent
  │                                                            ◀────  SSE chunks
  └─ chatApi.js ───POST + read stream───▶ (plain text chunks, not SSE, back to browser)
```

Two separate processes, two separate `npm` projects:

- **`frontend/`** — the existing React/Vite calculator app. The chatbot widget
  lives entirely under `frontend/src/components/chatbot/`.
- **`backend/`** — a brand-new, minimal Express server (`backend/`, sibling to
  `frontend/`). Its only job is to hold the API key server-side and proxy chat
  requests to Gemini. It didn't exist before this feature — the calculator
  itself has always been a pure frontend app with no backend at all.

They talk over plain HTTP on two different local ports (frontend `:5173`,
backend `:3001`), which is why CORS matters here (more below).

## Frontend: the widget

All chatbot code lives in `frontend/src/components/chatbot/`, split into small,
single-purpose files:

| File | Responsibility |
|---|---|
| `useDraggable.js` | Pure hook: tracks `{x,y}` position, clamps it to the browser viewport so the widget can never be dragged off-screen, distinguishes a click from a drag. |
| `usePersistedState.js` | A drop-in replacement for `useState` that also reads/writes `localStorage`. Used three times: drag position, panel open/closed, and message history. |
| `chatApi.js` | The only file that talks to the backend. POSTs `{ messages }` to `/api/chat`, reads the response body as a stream, and calls `onChunk(text)` as pieces arrive. |
| `ChatBubble.jsx` | The closed "mascot" state — just a draggable circle + dismiss button. No state of its own. |
| `ChatPanel.jsx` | The open conversation view — message list, input box, send button. Also no state beyond the text you're currently typing. |
| `ChatbotWidget.jsx` | The only file that *owns* anything. Wires the two hooks and `chatApi` together, decides whether to render the bubble or the panel, and is where a message actually gets sent. |

`ChatbotWidget` is mounted once in `App.jsx`, as a sibling to the page content —
that's why it floats over every screen of the app rather than belonging to any
one page.

**Why three separate `localStorage` keys instead of one blob?** Position,
open/closed, and message history change independently and at different rates
(dragging fires many times a second, a new message is occasional) — keeping
them separate means dragging doesn't rewrite your whole chat history to disk
on every pixel of movement.

## Backend: the proxy

`backend/src/`:

| File | Responsibility |
|---|---|
| `server.js` | Express app setup — CORS, JSON body parsing, mounts the rate limiter and the one route. This is the file you run (`npm start`). |
| `routes/chat.js` | The `POST /api/chat` handler. Validates the request, picks a provider, streams the reply back, catches errors so a bad response from the AI provider can't crash the whole server. |
| `rateLimiter.js` | A small hand-written in-memory limiter (no external package) — tracks request timestamps per IP, blocks with `429` once you exceed the quota in a rolling window. |
| `systemPrompt.js` | Ada's persona, described above. |
| `providers/index.js` | A lookup table: given a provider name (from the `AI_PROVIDER` env var), return that provider's implementation, or `null` if it's not configured. |
| `providers/mockProvider.js` | A fake provider that echoes canned text with no network call — lets the whole app be tested/demoed with zero API keys. |
| `providers/gemini.js` | The real one. Calls Google's Gemini API and streams the reply back. |

### Why a "provider" abstraction at all?

`routes/chat.js` doesn't know or care whether it's talking to the mock, Gemini,
or (later) something else — it just calls `provider.stream(messages, systemPrompt)`
and forwards whatever text comes out. Every provider implements the same shape:

```js
{
  name: 'gemini',
  isConfigured: () => boolean,          // do we have what we need to actually call this?
  async *stream(messages, systemPrompt) // yields text chunks as they arrive
}
```

Swapping providers is just changing `AI_PROVIDER=gemini` to `AI_PROVIDER=mock`
(or adding a new file for a different provider) — nothing in the route, the
rate limiter, or the frontend has to change.

### How a message actually flows through, end to end

1. You type a message and hit Send. `ChatbotWidget` immediately shows your
   message, plus an empty placeholder for Ada's reply.
2. `chatApi.js` POSTs the whole conversation history (not just your latest
   message — Gemini needs prior turns for context) to `http://localhost:3001/api/chat`.
3. `server.js` runs your request through the rate limiter first — if you're
   over quota, it responds `429` and nothing downstream ever runs.
4. `routes/chat.js` checks the message shape is valid (each one has a real
   `role` of `user`/`assistant` and non-empty `content` — this is also what
   blocks someone from sneaking in a `role: "system"` message to hijack the
   persona), then asks the provider registry for whichever provider
   `AI_PROVIDER` names.
5. If that provider isn't configured (no API key set), you get a clean `503`
   instead of a crash.
6. `providers/gemini.js` calls Google's `streamGenerateContent` endpoint with
   `alt=sse`, which makes Gemini send its reply back as **Server-Sent Events**
   — a stream of `data: {...}\n\n` lines, each containing the next chunk of
   text as the model generates it.
7. The provider parses each SSE line, pulls out just the text, and `yield`s it.
   `routes/chat.js` writes each yielded piece straight onto the HTTP response
   as plain text (no SSE framing on this leg — it's a simpler protocol between
   *our* backend and *our* frontend, since we control both ends).
8. `chatApi.js` on the frontend reads the response body as a raw byte stream
   and decodes it chunk by chunk, calling `onChunk` each time.
9. `ChatbotWidget` appends each chunk onto the placeholder message, which is
   why the reply appears to type itself in rather than popping in all at once.
10. Once the stream ends, the full conversation (your message + Ada's complete
    reply) gets written to `localStorage`, so reloading the page doesn't lose it.

### Security notes (things a public HTTP endpoint needs that a frontend-only app doesn't)

- **API key never reaches the browser.** It lives in `backend/.env` (gitignored)
  and is only ever used server-side. The frontend doesn't know it exists.
- **Key goes in a request header, not a URL.** URLs commonly end up in server
  and proxy access logs; headers generally don't.
- **CORS is locked to one origin** (`CORS_ORIGIN` env var, defaults to the
  Vite dev server) rather than accepting requests from any website.
- **Rate limiting** exists specifically because every message costs real money
  once a real provider is wired up — without it, a runaway frontend bug (or
  someone hammering the endpoint directly) could rack up API charges.
- **Role validation** rejects anything except `user`/`assistant` roles, which
  is what stops a client from injecting a fake `system` message to override
  Ada's instructions.

## How to switch providers or add a new one

Set `AI_PROVIDER` in `backend/.env`:
- `mock` — no key needed, canned responses, good for UI development.
- `gemini` — needs `GEMINI_API_KEY` (free tier available at
  [aistudio.google.com](https://aistudio.google.com)), optionally
  `GEMINI_MODEL` to override the default model.

To add another provider (say, a cheaper one for production volume), create
`backend/src/providers/<name>.js` implementing the same
`{ name, isConfigured, stream }` shape as `gemini.js`, then add one line to
the `REGISTRY` object in `providers/index.js`. Nothing else needs to change.
