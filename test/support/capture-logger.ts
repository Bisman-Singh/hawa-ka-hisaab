// A logger whose lines a test can read back.
import type { Clock } from '../../src/lib/clock.js';
import { createLogger, type Logger, type LogLevel } from '../../src/lib/logger.js';

/** One captured line with its level. */
export interface CapturedLine {
  readonly level: LogLevel;
  readonly line: string;
}

/** A real logger writing into an array. */
export interface CaptureLogger {
  readonly logger: Logger;
  readonly lines: readonly CapturedLine[];
  readonly text: () => string;
}

/** Creates a logger that records every line it writes. */
export function createCaptureLogger(clock: Clock): CaptureLogger {
  const lines: CapturedLine[] = [];
  const logger = createLogger((level, line) => {
    lines.push({ level, line });
  }, clock);
  return { logger, lines, text: () => lines.map((entry) => entry.line).join('\n') };
}
