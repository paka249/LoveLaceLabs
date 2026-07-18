import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import * as AuthContext from '../auth/AuthContext';

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }) => (
    <div>
      <button onClick={() => onSuccess({ credential: 'fake-credential' })}>mock-google-success</button>
      <button onClick={() => onError()}>mock-google-error</button>
    </div>
  ),
}));

describe('Login', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls login() with the Google credential on success and navigates home', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('mock-google-success'));
    await waitFor(() => expect(login).toHaveBeenCalledWith('fake-credential'));
  });

  it('shows an inline error when login() rejects', async () => {
    const login = vi.fn().mockRejectedValue(new Error('bad token'));
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('mock-google-success'));
    await waitFor(() => expect(screen.getByText(/couldn't verify/i)).toBeInTheDocument());
  });

  it('shows an inline error when Google itself reports an error', async () => {
    const login = vi.fn();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('mock-google-error'));
    await waitFor(() => expect(screen.getByText(/couldn't verify/i)).toBeInTheDocument());
    expect(login).not.toHaveBeenCalled();
  });
});
