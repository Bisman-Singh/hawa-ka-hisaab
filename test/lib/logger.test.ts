// Tests for the logger: one JSON line per event, and user text never written.
import { describe, expect, it, vi } from 'vitest';
import { consoleSink, REDACTED } from '../../src/lib/logger.js';
import { createCaptureLogger } from '../support/capture-logger.js';
import { createFakeClock } from '../support/fake-clock.js';

const parse = (line: string | undefined): unknown => JSON.parse(line ?? '');

describe('createLogger', () => {
  it('writes the time, level, event and fields as one JSON line', () => {
    const capture = createCaptureLogger(createFakeClock(Date.parse('2026-11-24T16:30:00Z')));
    capture.logger.info('request', { route: '/api/health', method: 'GET', status: 200, durationMs: 4 });
    expect(capture.lines).toHaveLength(1);
    expect(parse(capture.lines[0]?.line)).toEqual({
      time: '2026-11-24T16:30:00.000Z',
      level: 'info',
      event: 'request',
      route: '/api/health',
      method: 'GET',
      status: 200,
      durationMs: 4,
    });
  });

  it('passes the level to the sink for warnings and errors', () => {
    const capture = createCaptureLogger(createFakeClock());
    capture.logger.warn('feed_stale');
    capture.logger.error('request_failed', { errorName: 'TypeError' });
    expect(capture.lines.map((entry) => entry.level)).toEqual(['warn', 'error']);
  });

  it('redacts any string that is not a short code, so user text cannot be logged', () => {
    const capture = createCaptureLogger(createFakeClock());
    const question = 'my daughter has asthma, can she play football at 6?';
    capture.logger.info(question, { code: question, upstream: 'x'.repeat(65), route: 'ठीक' });
    expect(capture.text()).not.toContain('daughter');
    expect(parse(capture.lines[0]?.line)).toMatchObject({
      event: REDACTED,
      code: REDACTED,
      upstream: REDACTED,
      route: REDACTED,
    });
  });

  it('keeps route patterns, including wildcards and parameters', () => {
    const capture = createCaptureLogger(createFakeClock());
    capture.logger.info('request', { route: '/api/*' });
    capture.logger.info('request', { route: '/api/items/:id' });
    expect(capture.lines.map((entry) => parse(entry.line))).toEqual([
      expect.objectContaining({ route: '/api/*' }),
      expect.objectContaining({ route: '/api/items/:id' }),
    ]);
  });

  it('redacts numbers that are not finite', () => {
    const capture = createCaptureLogger(createFakeClock());
    capture.logger.info('timing', { durationMs: Number.NaN, count: Number.POSITIVE_INFINITY, bytes: 10 });
    expect(parse(capture.lines[0]?.line)).toMatchObject({ durationMs: REDACTED, count: REDACTED, bytes: 10 });
  });

  it('leaves out fields that were not given', () => {
    const capture = createCaptureLogger(createFakeClock());
    capture.logger.info('start');
    const line = parse(capture.lines[0]?.line);
    expect(typeof line === 'object' && line !== null ? Object.keys(line) : []).toEqual([
      'time',
      'level',
      'event',
    ]);
  });
});

describe('consoleSink', () => {
  it('writes errors to standard error and other levels to standard output', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleSink('info', 'a');
    consoleSink('warn', 'b');
    consoleSink('error', 'c');
    expect(log.mock.calls).toEqual([['a'], ['b']]);
    expect(error.mock.calls).toEqual([['c']]);
  });
});
