import { UI_TEXT } from './labels';

// Cliente HTTP del navegador. Toda llamada a la API pasa por aquí.

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Array<{ field: string; message: string }> };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: Array<{ field: string; message: string }>;

  public constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.status = status;
    this.details = body.details ?? [];
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: UI_TEXT.networkError });
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const errorBody = (payload as ApiErrorBody | null)?.error ?? {
      code: 'INTERNAL_ERROR',
      message: UI_TEXT.networkError,
    };
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('medicitas:unauthenticated'));
    }
    throw new ApiError(response.status, errorBody);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body),
};

export function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}
