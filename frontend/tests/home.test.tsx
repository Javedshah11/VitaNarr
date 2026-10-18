import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Home from '../src/app/page';
import { AuthProvider } from '../src/features/auth/auth-context';

describe('VitaNarr landing page', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'No session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  it('introduces the product, process and factual-writing promise', () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Every life deserves to be remembered.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Remember naturally')).toBeInTheDocument();
    expect(screen.getByText('Beautiful writing. Still unmistakably true.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /begin your story/i }).length).toBeGreaterThan(0);
  });
});
