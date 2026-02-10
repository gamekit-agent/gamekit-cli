import chalk from 'chalk';

/**
 * Output options passed from CLI flags.
 * Represents the --json global flag.
 */
export interface OutputOptions {
  json?: boolean;
}

/**
 * Determine if output should be in JSON mode.
 * Returns true if --json flag is set OR stdout is not a TTY (piped output).
 */
export function isJsonMode(options: OutputOptions): boolean {
  return options.json === true || !process.stdout.isTTY;
}

/**
 * Write structured data as JSON to stdout.
 * Always outputs JSON with 2-space indentation for machine consumption.
 */
export function outputSuccess(data: unknown, options: OutputOptions): void {
  const json = JSON.stringify(data, null, 2);
  process.stdout.write(json + '\n');
}

/**
 * Write an error as JSON to stdout and human-readable to stderr, then exit.
 *
 * This function never returns (process.exit). Commands that want to handle
 * errors without exiting should catch GameKitError themselves.
 */
export function outputError(code: string, message: string, exitCode: number = 1): never {
  const json = JSON.stringify({ error: { code, message } });
  process.stdout.write(json + '\n');

  if (process.stderr.isTTY) {
    process.stderr.write(chalk.red('\nError: ' + message + '\n'));
  }

  process.exit(exitCode);
}

/**
 * Write a human-readable status message to stderr.
 * Only outputs when stderr is a TTY (suppressed when piped).
 */
export function log(message: string): void {
  if (process.stderr.isTTY) {
    process.stderr.write(message + '\n');
  }
}

/**
 * Write a success message to stderr with a green checkmark.
 * Only outputs when stderr is a TTY.
 */
export function logSuccess(message: string): void {
  if (process.stderr.isTTY) {
    process.stderr.write(chalk.green('\u2714 ' + message) + '\n');
  }
}

/**
 * Write a warning message to stderr with a yellow indicator.
 * Only outputs when stderr is a TTY.
 */
export function logWarning(message: string): void {
  if (process.stderr.isTTY) {
    process.stderr.write(chalk.yellow('! ' + message) + '\n');
  }
}
