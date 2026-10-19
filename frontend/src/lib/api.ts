export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'disabled';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticationResponse {
  accessToken: string;
  user: SafeUser;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | { message?: string };
    };
    const message = body.message;

    if (typeof message === 'string') {
      return message;
    }

    if (message && typeof message.message === 'string') {
      return message.message;
    }
  } catch {
    // Fall through to the status-based message.
  }

  return response.status >= 500
    ? 'VitaNarr is temporarily unavailable. Please try again.'
    : 'We could not complete that request.';
}
