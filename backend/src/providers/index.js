import { mockProvider } from './mockProvider.js';

const REGISTRY = {
  mock: mockProvider,
};

export function getProvider(name) {
  const provider = REGISTRY[name];
  if (!provider || !provider.isConfigured()) return null;
  return provider;
}
