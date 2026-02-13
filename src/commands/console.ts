import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, log, logWarning } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface LogEntry {
  message: string;
  stackTrace: string | null;
  severity: string;
  mode: string;
  timestamp: string;
  sequence: number;
}

interface ConsoleResult {
  entries: LogEntry[];
  totalCount: number;
  droppedCount: number;
}

export interface ConsoleOptions extends OutputOptions {
  errors?: boolean;
  warnings?: boolean;
  info?: boolean;
  follow?: boolean;
  limit?: string;
}

export async function consoleCommand(options: ConsoleOptions): Promise<void> {
  const info = await getConnection(process.cwd());

  if (options.follow) {
    await streamLogs(info.port, options);
    return;
  }

  // Determine severity filter
  let severity: string | null = null;
  if (options.errors) severity = 'error';
  else if (options.warnings) severity = 'warning';
  else if (options.info) severity = 'info';

  const params = new URLSearchParams();
  if (severity) params.set('severity', severity);
  if (options.limit) params.set('limit', options.limit);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await request<ConsoleResult>(info.port, 'GET', `/console${query}`);

  // JSON output to stdout
  outputSuccess(result, options);

  // Human-readable output to stderr
  if (result.droppedCount > 0) {
    logWarning(`${result.droppedCount} log entries were dropped (buffer full)`);
  }

  if (result.entries.length === 0) {
    log('No log entries');
    return;
  }

  for (const entry of result.entries) {
    const ts = entry.timestamp.substring(11, 19); // HH:MM:SS from ISO
    log(`[${ts}] [${entry.mode}] ${entry.severity}: ${entry.message}`);
    if (entry.stackTrace) {
      log(`  ${entry.stackTrace}`);
    }
  }
}

async function streamLogs(port: number, options: ConsoleOptions): Promise<void> {
  const url = `http://localhost:${port}/api/console/stream`;

  // Determine severity filter for client-side filtering
  let severityFilter: string | null = null;
  if (options.errors) severityFilter = 'error';
  else if (options.warnings) severityFilter = 'warning';
  else if (options.info) severityFilter = 'info';

  let retries = 0;
  const maxRetries = 5;

  while (retries <= maxRetries) {
    if (retries > 0) {
      const delay = Math.pow(2, retries - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
      log(`Reconnecting in ${delay / 1000}s... (attempt ${retries}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }

    let res: Response;
    try {
      res = await fetch(url);
    } catch (error: unknown) {
      const err = error as { cause?: { code?: string } };
      if (err.cause?.code === 'ECONNREFUSED') {
        retries++;
        if (retries > maxRetries) {
          outputError('STREAM_DISCONNECTED', 'Lost connection to Unity log stream');
        }
        continue;
      }
      throw new GameKitError(
        'CONNECTION_ERROR',
        'Failed to connect to Unity log stream: ' + (error as Error).message
      );
    }

    if (!res.ok || !res.body) {
      outputError('STREAM_ERROR', `Unexpected response from Unity: ${res.status}`);
    }

    // Successfully connected -- reset retry counter
    retries = 0;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Handle Ctrl+C gracefully
    const sigintHandler = () => {
      reader.cancel();
      process.exit(0);
    };
    process.on('SIGINT', sigintHandler);

    log('Streaming logs (Ctrl+C to stop)...');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events: split on double newline
        const parts = buffer.split('\n\n');
        // Keep the last incomplete part in the buffer
        buffer = parts.pop() || '';

        for (const part of parts) {
          // Skip comments (heartbeats, connection confirmations)
          if (part.startsWith(':')) continue;

          // Parse data lines
          const dataPrefix = 'data: ';
          if (!part.startsWith(dataPrefix)) continue;

          const jsonStr = part.substring(dataPrefix.length);
          let entry: LogEntry;
          try {
            entry = JSON.parse(jsonStr);
          } catch {
            continue; // Skip malformed events
          }

          // Apply client-side severity filter
          if (severityFilter && entry.severity !== severityFilter) continue;

          // NDJSON to stdout (machine-readable)
          process.stdout.write(JSON.stringify(entry) + '\n');

          // Human-readable to stderr
          const ts = entry.timestamp.substring(11, 19);
          log(`[${ts}] [${entry.mode}] ${entry.severity}: ${entry.message}`);
          if (entry.stackTrace) {
            log(`  ${entry.stackTrace}`);
          }
        }
      }
    } catch (error: unknown) {
      // Reader cancelled (Ctrl+C) or connection dropped
      const err = error as { name?: string };
      if (err.name === 'AbortError') {
        process.exit(0);
      }
    } finally {
      process.removeListener('SIGINT', sigintHandler);
    }

    // Connection dropped -- attempt reconnect
    retries++;
    if (retries > maxRetries) {
      outputError('STREAM_DISCONNECTED', 'Lost connection to Unity log stream');
    }
  }
}
