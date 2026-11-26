// The clock port. Code asks it for the time so tests can control time.

/** Source of the current time in epoch milliseconds. */
export interface Clock {
  now(): number;
}

/** The real clock, backed by the system time. */
export const systemClock: Clock = {
  now: () => Date.now(),
};
