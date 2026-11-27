// Security headers for pages and API responses. vercel.json, the preview server and the API use these values.

/** One response header as a key and value pair, the shape vercel.json uses. */
export interface HeaderPair {
  readonly key: string;
  readonly value: string;
}

const PAGE_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
  'upgrade-insecure-requests',
].join('; ');

const API_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

const COMMON_HEADERS: readonly HeaderPair[] = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

/** Headers on every static page and asset. Inline scripts and styles are not allowed. */
export const PAGE_HEADERS: readonly HeaderPair[] = [
  { key: 'Content-Security-Policy', value: PAGE_POLICY },
  ...COMMON_HEADERS,
];

/** Headers on every API response. JSON responses load nothing, so the policy denies everything. */
export const API_HEADERS: readonly HeaderPair[] = [
  { key: 'Content-Security-Policy', value: API_POLICY },
  ...COMMON_HEADERS,
];
