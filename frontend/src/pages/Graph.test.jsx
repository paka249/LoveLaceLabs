import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Graph from './Graph';
import * as AuthContext from '../auth/AuthContext';

vi.mock('../components/chatbot/ChatbotWidget', () => ({
  default: () => <div data-testid="chatbot-widget" />,
}));

describe('Graph page', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders one empty function row and a canvas by default', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null, loading: false, logout: vi.fn() });

    const { container } = render(
      <MemoryRouter>
        <Graph
          sidebarOpen={true}
          onToggleSidebar={vi.fn()}
          chatbotDismissed={true}
          onDismissChatbot={vi.fn()}
          onRestoreChatbot={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
