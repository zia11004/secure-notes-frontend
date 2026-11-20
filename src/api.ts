const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  roleId?: string | null;
  roleName?: string;
  permissions?: string[];
  interests: string[];
  createdAt: string;
}

export interface Note {
  id: string;
  ownerId: string;
  ownerUsername?: string | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername?: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export interface InterestGroup {
  interest: string;
  memberCount: number;
  members: Pick<User, 'id' | 'username' | 'name' | 'email'>[];
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDefinition { key: string; label: string }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
  }
}

/** Sends one JSON request and preserves the API's stable error contract. */
export async function api<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  if (response.status === 204) return undefined as T;

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && options.token) {
      window.dispatchEvent(new Event('secure-notes:session-expired'));
    }
    const error = result && typeof result === 'object' && 'error' in result
      ? (result as { error?: { message?: string; code?: string } }).error : undefined;
    throw new ApiError(error?.message ?? 'The request failed.', response.status, error?.code ?? 'REQUEST_FAILED');
  }
  return result as T;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}
