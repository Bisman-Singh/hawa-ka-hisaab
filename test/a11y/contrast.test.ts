// Checks the contrast of the colour tokens against WCAG 2.2 AA: 4.5 for text, 3 for focus indicators.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/styles/tokens.css', 'utf8');

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1]) {
    throw new Error(`token --${name} is missing or not a six digit hex colour`);
  }
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe('colour tokens', () => {
  it('computes known contrast ratios correctly', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('keeps every text colour at 4.5:1 or more on the paper colour', () => {
    for (const name of ['color-ink', 'color-muted', 'color-alert', 'color-focus']) {
      expect(contrast(token(name), token('color-paper'))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the skip link text readable on its ink background', () => {
    expect(contrast(token('color-paper'), token('color-ink'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the focus ring at 3:1 or more against the paper colour', () => {
    expect(contrast(token('color-focus'), token('color-paper'))).toBeGreaterThanOrEqual(3);
  });
});
