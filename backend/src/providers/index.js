import { mockProvider } from './mockProvider.js';
import { geminiProvider } from './gemini.js';

const REGISTRY = {
  mock: mockProvider,
  gemini: geminiProvider,
};

export function getProvider(name) {
  const provider = REGISTRY[name];
  if (!provider || !provider.isConfigured()) return null;
  return provider;
}
