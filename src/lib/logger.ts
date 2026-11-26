// Structured logger. Lines carry an event name and a closed set of fields whose strings are short codes.
// Free text such as a household description or a question has no field to go in, and odd strings are redacted.
import type { Clock } from './clock.js';

/** Severity of a log line. */
export type LogLevel = 'info' | 'warn' | 'error';

const names = <const T extends readonly string[]>(list: T): T => list;
const TEXT_FIELDS = names(['route', 'method', 'code', 'upstream', 'errorName']);
const NUMBER_FIELDS = names(['status', 'durationMs', 'count', 'bytes', 'attempt']);

/** The only fields a log line may carry. Text fields hold codes written in source, never user input. */
export type LogFields = Readonly<
  Partial<Record<(typeof TEXT_FIELDS)[number], string> & Record<(typeof NUMBER_FIELDS)[number], number>>
>;

/** Receives finished log lines. */
export type LogSink = (level: LogLevel, line: string) => void;

/** The logger port. */
export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

const CODE_PATTERN = /^[A-Za-z0-9_.:/*-]{1,64}$/;

/** Placeholder written in place of any string that does not look like a code. */
export const REDACTED = '[redacted]';

function cleanText(value: string): string {
  return CODE_PATTERN.test(value) ? value : REDACTED;
}

function cleanNumber(value: number): number | string {
  return Number.isFinite(value) ? value : REDACTED;
}

function collect(fields: LogFields): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const name of TEXT_FIELDS) {
    const value = fields[name];
    if (value !== undefined) {
      out[name] = cleanText(value);
    }
  }
  for (const name of NUMBER_FIELDS) {
    const value = fields[name];
    if (value !== undefined) {
      out[name] = cleanNumber(value);
    }
  }
  return out;
}

/** Builds a logger that writes one JSON line per event to the sink. */
export function createLogger(sink: LogSink, clock: Clock): Logger {
  const write =
    (level: LogLevel) =>
    (event: string, fields: LogFields = {}) => {
      const time = new Date(clock.now()).toISOString();
      sink(level, JSON.stringify({ time, level, event: cleanText(event), ...collect(fields) }));
    };
  return { info: write('info'), warn: write('warn'), error: write('error') };
}

/** Writes errors to standard error and everything else to standard output. */
export const consoleSink: LogSink = (level, line) => {
  if (level === 'error') {
    console.error(line);
    return;
  }
  console.log(line);
};
