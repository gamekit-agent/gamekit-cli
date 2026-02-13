import { GameKitError } from './connection.js';

/**
 * Standard API response envelope from the Unity gamekit plugin.
 * All Unity endpoints return this structure.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

/**
 * Check if an error is transient and worth retrying.
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof GameKitError) return false; // API-level errors are not transient
  const err = error as { name?: string; cause?: { code?: string } };
  return err.cause?.code === 'ECONNREFUSED' || err.name === 'TimeoutError';
}

/**
 * Send an HTTP request to the Unity gamekit plugin and return typed data.
 *
 * Constructs URL as http://localhost:{port}/api{path}, sends the request,
 * and unwraps the ApiResponse envelope. Throws GameKitError for API errors,
 * connection refused, timeouts, and other network failures.
 *
 * Retries up to 3 times with exponential backoff for transient failures
 * (connection refused, timeouts).
 *
 * @param port - The port number from ServerInfo
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - API path (e.g., "/health", "/refresh")
 * @param body - Optional request body (will be JSON-serialized)
 * @param timeoutMs - Request timeout in milliseconds (default 10000)
 * @returns The unwrapped data from the API response
 */
export async function request<T>(
  port: number,
  method: string,
  path: string,
  body?: unknown,
  timeoutMs: number = 10000
): Promise<T> {
  const url = `http://localhost:${port}/api${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new GameKitError('HTTP_ERROR', `Unity returned HTTP ${res.status}: ${text}`);
      }

      const envelope: ApiResponse<T> = await res.json();

      if (!envelope.success) {
        throw new GameKitError(
          envelope.error?.code ?? 'UNKNOWN_ERROR',
          envelope.error?.message ?? 'Unknown error from Unity plugin'
        );
      }

      return envelope.data!;
    } catch (error: unknown) {
      lastError = error;

      // Don't retry API-level errors
      if (!isTransientError(error)) break;

      // Don't sleep after the last attempt
      if (attempt < MAX_RETRIES - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }

  // Re-throw GameKitError as-is (from envelope parsing above)
  if (lastError instanceof GameKitError) {
    throw lastError;
  }

  const err = lastError as { name?: string; message?: string; cause?: { code?: string } };

  // Connection refused — Unity is not running or plugin not listening
  if (err.cause?.code === 'ECONNREFUSED') {
    throw new GameKitError(
      'UNITY_NOT_RUNNING',
      'Cannot connect to Unity. Is the gamekit plugin running?\n\nTry: gamekit doctor'
    );
  }

  // Timeout — Unity is busy or unresponsive
  if (err.name === 'TimeoutError') {
    throw new GameKitError(
      'TIMEOUT',
      'Request to Unity timed out. The editor may be busy.'
    );
  }

  // Other network errors
  throw new GameKitError(
    'CONNECTION_ERROR',
    'Failed to communicate with Unity: ' + (err.message ?? 'unknown error')
  );
}
