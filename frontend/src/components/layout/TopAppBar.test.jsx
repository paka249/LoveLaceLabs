import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopAppBar from './TopAppBar';
import * as AuthContext from '../../auth/AuthContext';

describe('TopAppBar', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows a "Sign in" link when logged out', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    render(<MemoryRouter><TopAppBar sidebarOpen={true} /></MemoryRouter>);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('shows nothing account-related while loading', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null, loading: true, logout: vi.fn() });
    render(<MemoryRouter><TopAppBar sidebarOpen={true} /></MemoryRouter>);
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it('shows the user avatar/name and a working log out button when logged in', () => {
    const logout = vi.fn();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'a@b.com', name: 'Ada', pictureUrl: null },
      loading: false,
      logout,
    });
    render(<MemoryRouter><TopAppBar sidebarOpen={true} /></MemoryRouter>);

    const avatarButton = screen.getByTitle('Ada');
    fireEvent.click(avatarButton);
    fireEvent.click(screen.getByText(/log out/i));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
