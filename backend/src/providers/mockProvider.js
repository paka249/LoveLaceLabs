export const mockProvider = {
  name: 'mock',
  isConfigured: () => true,
  async *stream(messages) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const reply =
      `Here's a mock answer to: "${lastUserMessage?.content ?? ''}". ` +
      'Once a real AI provider is configured, this is where an actual homework answer will appear.';
    const words = reply.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  },
};
