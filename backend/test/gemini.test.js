import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geminiProvider } from '../src/providers/gemini.js';

function sseResponse(events) {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  const encoder = new TextEncoder();
  const bytes = encoder.encode(body);
  let sent = false;
  return {
    ok: true,
    body: {
      getReader() {
        return {
          read() {
            if (sent) return Promise.resolve({ done: true, value: undefined });
            sent = true;
            return Promise.resolve({ done: false, value: bytes });
          },
        };
      },
    },
  };
}

test('isConfigured reflects presence of GEMINI_API_KEY', () => {
  const original = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    assert.equal(geminiProvider.isConfigured(), false);
    process.env.GEMINI_API_KEY = 'test-key';
    assert.equal(geminiProvider.isConfigured(), true);
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});

test('stream yields decoded text chunks parsed from the SSE response', async () => {
  const fakeFetch = async () =>
    sseResponse([
      { candidates: [{ content: { parts: [{ text: 'Hello ' }] } }] },
      { candidates: [{ content: { parts: [{ text: 'world' }] } }] },
    ]);

  const chunks = [];
  for await (const chunk of geminiProvider.stream(
    [{ role: 'user', content: 'hi' }],
    'system prompt',
    { fetchImpl: fakeFetch }
  )) {
    chunks.push(chunk);
  }
  assert.deepEqual(chunks, ['Hello ', 'world']);
});

test('stream throws when the API responds with a non-ok status', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 429,
    text: async () => 'quota exceeded',
  });

  await assert.rejects(async () => {
    for await (const _chunk of geminiProvider.stream([{ role: 'user', content: 'hi' }], 'sys', {
      fetchImpl: fakeFetch,
    })) {
      // no-op
    }
  }, /Gemini API request failed \(429\)/);
});

test('stream maps assistant/user roles to Gemini model/user roles and includes the system prompt', async () => {
  let capturedBody;
  const fakeFetch = async (_url, init) => {
    capturedBody = JSON.parse(init.body);
    return sseResponse([{ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }]);
  };

  const chunks = [];
  for await (const chunk of geminiProvider.stream(
    [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second' },
    ],
    'be helpful',
    { fetchImpl: fakeFetch }
  )) {
    chunks.push(chunk);
  }

  assert.equal(chunks.join(''), 'ok');
  assert.deepEqual(capturedBody.contents, [
    { role: 'user', parts: [{ text: 'first' }] },
    { role: 'model', parts: [{ text: 'second' }] },
  ]);
  assert.deepEqual(capturedBody.systemInstruction, { parts: [{ text: 'be helpful' }] });
});

test('sends the API key as a header, never as a URL query parameter', async () => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'super-secret-key';

  let capturedUrl;
  let capturedHeaders;
  const fakeFetch = async (url, init) => {
    capturedUrl = url;
    capturedHeaders = init.headers;
    return sseResponse([{ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }]);
  };

  try {
    for await (const _chunk of geminiProvider.stream([{ role: 'user', content: 'hi' }], 'sys', {
      fetchImpl: fakeFetch,
    })) {
      // no-op
    }
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }

  assert.ok(!capturedUrl.includes('super-secret-key'), 'API key must not appear in the request URL');
  assert.equal(capturedHeaders['x-goog-api-key'], 'super-secret-key');
});
