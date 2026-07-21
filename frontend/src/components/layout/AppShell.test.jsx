import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppShell from './AppShell';
import * as AuthContext from '../../auth/AuthContext';

vi.mock('../chatbot/ChatbotWidget', () => ({
  default: () => <div data-testid="chatbot-widget" />,
}));

describe('AppShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the sidebar, top bar, and children', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null, loading: false, logout: vi.fn() });

    render(
      <MemoryRouter>
        <AppShell
          sidebarOpen={true}
          onToggleSidebar={vi.fn()}
          chatbotDismissed={true}
          onDismissChatbot={vi.fn()}
          onRestoreChatbot={vi.fn()}
        >
          <div data-testid="page-content">Hello</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('LovelaceLabs')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByTestId('chatbot-widget')).toBeInTheDocument();
  });
});
