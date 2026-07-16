import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProvider } from '../src/providers/index.js';

test('getProvider returns the mock provider for "mock"', () => {
  const provider = getProvider('mock');
  assert.ok(provider);
  assert.equal(provider.name, 'mock');
  assert.equal(typeof provider.stream, 'function');
});

test('getProvider returns null for an unregistered name', () => {
  assert.equal(getProvider('anthropic'), null);
  assert.equal(getProvider('nonexistent'), null);
});

test('getProvider returns null when no name is given', () => {
  assert.equal(getProvider(undefined), null);
});

test('mock provider streams a non-empty sequence of text chunks referencing the last user message', async () => {
  const provider = getProvider('mock');
  const chunks = [];
  for await (const chunk of provider.stream([
    { role: 'user', content: 'what is a derivative' },
  ])) {
    chunks.push(chunk);
  }
  assert.ok(chunks.length > 0);
  assert.ok(chunks.join('').includes('derivative'));
});
