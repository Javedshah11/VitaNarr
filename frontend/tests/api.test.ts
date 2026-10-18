import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiRequest, ApiError } from '../src/lib/api';

describe('API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes credentials for refresh-cookie authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/example');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/example',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('extracts the API public error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: {
              message: 'Invalid email or password.',
              statusCode: 401,
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(apiRequest('/api/auth/login')).rejects.toEqual(
      new ApiError('Invalid email or password.', 401),
    );
  });
});
