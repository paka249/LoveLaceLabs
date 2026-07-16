import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendChatMessage, ChatApiError } from './chatApi';

function mockStreamingResponse(chunks) {
  let index = 0;
  const encoder = new TextEncoder();
  return {
    ok: true,
    body: {
      getReader() {
        return {
          read() {
            if (index < chunks.length) {
              const value = encoder.encode(chunks[index]);
              index += 1;
              return Promise.resolve({ done: false, value });
            }
            return Promise.resolve({ done: true, value: undefined });
          },
        };
      },
    },
  };
}

describe('sendChatMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes onChunk for each streamed chunk in order', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockStreamingResponse(['Hello ', 'world']));
    const chunks = [];
    await sendChatMessage([{ role: 'user', content: 'hi' }], { onChunk: (c) => chunks.push(c) });
    expect(chunks).toEqual(['Hello ', 'world']);
  });

  it('sends the messages array as the JSON request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockStreamingResponse(['ok']));
    global.fetch = fetchMock;
    await sendChatMessage([{ role: 'user', content: 'hi' }]);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toEqual({ messages: [{ role: 'user', content: 'hi' }] });
  });

  it('throws a ChatApiError with the response status and server message when not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: 'not configured' }),
    });
    await expect(sendChatMessage([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      status: 503,
      message: 'not configured',
    });
  });

  it('throws a ChatApiError instance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    });
    await expect(sendChatMessage([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(ChatApiError);
  });
});
