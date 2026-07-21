import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  afterEach(() => {
    cleanup();
  });

  it('highlights Calculator as active on the root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar open={true} onToggle={() => {}} onRestoreChatbot={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Calculator').closest('a')).toHaveClass('text-primary');
    expect(screen.getByText('Graph').closest('a')).not.toHaveClass('text-primary');
  });

  it('highlights Graph as active on the /graph route', () => {
    render(
      <MemoryRouter initialEntries={['/graph']}>
        <Sidebar open={true} onToggle={() => {}} onRestoreChatbot={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Graph').closest('a')).toHaveClass('text-primary');
    expect(screen.getByText('Calculator').closest('a')).not.toHaveClass('text-primary');
  });

  it('links Calculator to / and Graph to /graph', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar open={true} onToggle={() => {}} onRestoreChatbot={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Calculator').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Graph').closest('a')).toHaveAttribute('href', '/graph');
  });

  it('still renders non-linked items (e.g. Calculus) as inert placeholders', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar open={true} onToggle={() => {}} onRestoreChatbot={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Calculus').closest('a')).toHaveAttribute('href', '#');
  });
});
