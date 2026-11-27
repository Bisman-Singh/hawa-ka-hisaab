// Tests for the security headers: a strict page policy and a deny-all API policy.
import { describe, expect, it } from 'vitest';
import { API_HEADERS, PAGE_HEADERS } from '../../src/config/headers.js';

const policyOf = (headers: typeof PAGE_HEADERS) =>
  headers.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';

describe('PAGE_HEADERS', () => {
  const policy = policyOf(PAGE_HEADERS);

  it('allows scripts and styles from this origin only, with no inline or eval', () => {
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("style-src 'self'");
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|\*|http:/);
  });

  it('forbids framing, plugins and base tag tricks, and requires trusted types', () => {
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("require-trusted-types-for 'script'");
  });
});

describe('Permissions-Policy', () => {
  it('turns off the device features this app never uses, allows location for this site only, and names no withdrawn feature', () => {
    const value = PAGE_HEADERS.find((header) => header.key === 'Permissions-Policy')?.value ?? '';
    expect(value.split(', ')).toEqual([
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=()',
      'usb=()',
    ]);
    expect(value).not.toMatch(/browsing-topics|interest-cohort/);
  });
});

describe('API_HEADERS', () => {
  it('denies every resource type for JSON responses', () => {
    expect(policyOf(API_HEADERS)).toMatch(/^default-src 'none'/);
  });

  it('shares every header except the policy with the pages', () => {
    const rest = (headers: typeof PAGE_HEADERS) =>
      headers.filter((header) => header.key !== 'Content-Security-Policy');
    expect(rest(API_HEADERS)).toEqual(rest(PAGE_HEADERS));
    expect(rest(PAGE_HEADERS).map((header) => header.key)).toEqual([
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
    ]);
  });
});
