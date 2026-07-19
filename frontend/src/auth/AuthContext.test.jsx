import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.name : 'anonymous'}</div>
      <button onClick={() => login('fake-credential')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('starts logged out when /api/auth/me returns 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));
  });

  it('loads the user when /api/auth/me returns a profile', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', email: 'a@b.com', name: 'Ada', pictureUrl: null }),
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));
  });

  it('every request includes credentials: "include" so the session cookie is sent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    globalThis.fetch = fetchMock;
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.credentials).toBe('include');
  });

  it('login() POSTs the credential and updates user state on success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 }) // initial /me on mount
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '1', email: 'a@b.com', name: 'Ada', pictureUrl: null }),
      });
    globalThis.fetch = fetchMock;
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));

    const [, requestInit] = fetchMock.mock.calls[1];
    expect(JSON.parse(requestInit.body)).toEqual({ credential: 'fake-credential' });
  });

  it('login() throws when the backend rejects the credential', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 }) // initial /me
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'bad token' }) });
    globalThis.fetch = fetchMock;

    let thrown = null;
    function Catcher() {
      const { login } = useAuth();
      return <button onClick={() => login('bad').catch((e) => { thrown = e; })}>login</button>;
    }
    render(<AuthProvider><Catcher /></AuthProvider>);
    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(thrown).not.toBeNull());
    expect(thrown.message).toBe('bad token');
  });

  it('logout() clears user state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '1', email: 'a@b.com', name: 'Ada', pictureUrl: null }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = fetchMock;
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));
  });
});
