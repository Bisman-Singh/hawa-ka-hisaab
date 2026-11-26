// The owner's visual rules, pinned: no gradient, shadow, blur, soft corner, forced capitals or motion in the
// stylesheets apart from one stepped skeleton pulse, and no em dash, middle dot, arrow or emoji in UI text.
import { describe, expect, it } from 'vitest';
import { readText, repoFiles } from './repo.js';

/** The one stylesheet allowed to animate, and only its skeleton, and only when motion is welcome. */
export const PULSE_FILE = 'src/ui/styles/states.css';

const CSS_RULES: readonly (readonly [string, RegExp])[] = [
  ['gradient', /gradient\s*\(/i],
  ['shadow', /\b(box|text)-shadow\s*:/i],
  ['blur or backdrop filter', /blur\s*\(|backdrop-filter\s*:/i],
  ['text-transform', /text-transform\s*:/i],
  ['transition', /transition[\w-]*\s*:(?!\s*none\s*[;}])/i],
];

const TEXT_RULES: readonly (readonly [string, RegExp])[] = [
  ['em dash', /\u2014/u],
  ['middle dot separator', /[\u00b7\u2022\u2027\u2219\u22c5\u30fb]/u],
  ['arrow glyph', /[\u2190-\u21ff\u2794-\u27bf\u27f0-\u27ff\u2900-\u297f\u2b00-\u2bff\u{1f800}-\u{1f8ff}]/u],
  ['emoji', /\p{Extended_Pictographic}/u],
  ['inline style attribute', /\sstyle=[{"']|setAttribute\(\s*['"]style['"]/],
];

const fromCode = (hex: string): string => String.fromCodePoint(Number.parseInt(hex, 16));

/** Text with CSS and JavaScript escapes written out, so an escaped arrow is caught like a typed one. */
export function unescape(text: string): string {
  return text
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (_, hex: string) => fromCode(hex))
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => fromCode(hex))
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex: string) => fromCode(hex));
}

/** The at-rule and selector preludes around a position in a stylesheet, outermost first. */
export function blocksAt(css: string, index: number): string[] {
  const stack: string[] = [];
  let start = 0;
  for (let at = 0; at < index; at += 1) {
    const char = css[at];
    if (char === '{') {
      stack.push(css.slice(start, at).trim());
      start = at + 1;
    } else if (char === '}' || char === ';') {
      if (char === '}') {
        stack.pop();
      }
      start = at + 1;
    }
  }
  return stack;
}

function radiusProblems(css: string): string[] {
  const values = [...css.matchAll(/(?:radius|--r-[\w-]+)\s*:\s*([^;}]+)/gi)].map((match) => match[1] ?? '');
  const soft = values.filter((value) =>
    value
      .replace(/var\([^)]*\)/g, '')
      .split(/[\s/,]+/)
      .filter((part) => part !== '')
      .some((part) => part !== '0' && !(/^\d*\.?\d+px$/.test(part) && Number.parseFloat(part) <= 2)),
  );
  return soft.length > 0 ? ['radius above 2px'] : [];
}

function motionProblems(file: string, css: string): string[] {
  const moving = [...css.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/gi)].filter(
    (match) => !/^none\b/.test((match[1] ?? '').trim()),
  );
  const allowed = (index: number): boolean =>
    file === PULSE_FILE &&
    blocksAt(css, index).some((prelude) => /prefers-reduced-motion:\s*no-preference/.test(prelude));
  const stray =
    moving.some((match) => !allowed(match.index)) || (file !== PULSE_FILE && css.includes('@keyframes'));
  return stray ? ['animation outside the skeleton pulse'] : [];
}

/** Names the visual rules a stylesheet breaks. Comments are left out; they may name what is refused. */
export function cssProblems(file: string, text: string): string[] {
  const css = unescape(text).replace(/\/\*[\s\S]*?\*\//g, '');
  return [
    ...CSS_RULES.filter(([, pattern]) => pattern.test(css)).map(([name]) => name),
    ...radiusProblems(css),
    ...motionProblems(file, css),
  ];
}

/** Names the text rules a file shown to people breaks. */
export function uiTextProblems(text: string): string[] {
  const plain = unescape(text);
  return TEXT_RULES.filter(([, pattern]) => pattern.test(plain)).map(([name]) => name);
}

describe('cssProblems', () => {
  const pulse =
    '@media (prefers-reduced-motion: no-preference) {\n  .skel {\n    animation: wait 1.6s steps(2) infinite;\n  }\n}\n@keyframes wait { 50% { opacity: 0.5; } }';

  it('passes the rules the design keeps', () => {
    expect(
      cssProblems(
        'a.css',
        '.btn { border-radius: var(--r-ctl); border: 2px solid; }\n:root { --r-ctl: 2px; }',
      ),
    ).toEqual([]);
    expect(
      cssProblems(
        'a.css',
        '/* no gradient, no box-shadow: none */ .a { transition: none; animation: none; }',
      ),
    ).toEqual([]);
    expect(cssProblems(PULSE_FILE, pulse)).toEqual([]);
  });

  it('catches each refused look', () => {
    expect(cssProblems('a.css', '.a { background: linear-gradient(red, blue); }')).toEqual(['gradient']);
    expect(cssProblems('a.css', '.a { background: repeating-radial-gradient(red, blue); }')).toEqual([
      'gradient',
    ]);
    expect(cssProblems('a.css', '.a { box-shadow: 0 1px 2px #000; }')).toEqual(['shadow']);
    expect(cssProblems('a.css', '.a { text-shadow: 0 1px #000; }')).toEqual(['shadow']);
    expect(cssProblems('a.css', '.a { filter: blur(4px); }')).toEqual(['blur or backdrop filter']);
    expect(cssProblems('a.css', '.a { backdrop-filter: saturate(2); }')).toEqual(['blur or backdrop filter']);
    expect(cssProblems('a.css', '.a { text-transform: uppercase; }')).toEqual(['text-transform']);
    expect(cssProblems('a.css', '.a { transition: color 0.2s; }')).toEqual(['transition']);
    expect(cssProblems('a.css', '.a { transition-duration: 0.2s; }')).toEqual(['transition']);
  });

  it('allows corners of 2px at most, written plainly or as a token', () => {
    expect(cssProblems('a.css', '.a { border-radius: 3px; }')).toEqual(['radius above 2px']);
    expect(cssProblems('a.css', '.a { border-radius: 0.5rem; }')).toEqual(['radius above 2px']);
    expect(cssProblems('a.css', '.a { border-top-left-radius: 50%; }')).toEqual(['radius above 2px']);
    expect(cssProblems('a.css', ':root { --r-card: 8px; }')).toEqual(['radius above 2px']);
    expect(cssProblems('a.css', '.a { border-radius: 2px 0 1.5px 0; }')).toEqual([]);
  });

  it('allows the pulse only in its file, inside the no-preference block', () => {
    expect(cssProblems('src/ui/styles/other.css', pulse)).toEqual(['animation outside the skeleton pulse']);
    expect(cssProblems(PULSE_FILE, '.skel { animation: wait 1s infinite; }')).toEqual([
      'animation outside the skeleton pulse',
    ]);
    expect(cssProblems('a.css', '@keyframes spin { to { opacity: 0; } }')).toEqual([
      'animation outside the skeleton pulse',
    ]);
  });

  it('reads escapes, so an escaped glyph or property is caught too', () => {
    expect(unescape('content: "\\2192"; x: "\\u2014" y: "\\u{1F600}"')).toBe(
      'content: "\u2192"; x: "\u2014" y: "\u{1F600}"',
    );
    expect(blocksAt('@media x { .a { b: c; } } .d {', 17)).toEqual(['@media x', '.a']);
  });
});

describe('uiTextProblems', () => {
  it('passes plain text with the signs the app needs', () => {
    expect(uiTextProblems('PM2.5 342 µg/m³, NO₂ 76, ₹ 40, −2, 13 to 16, “quoted”, + and ×')).toEqual([]);
    expect(uiTextProblems('<span className="vh">x</span> हवा का हिसाब')).toEqual([]);
  });

  it('catches each refused sign, typed or escaped', () => {
    expect(uiTextProblems('one \u2014 two')).toEqual(['em dash']);
    expect(uiTextProblems('Delhi \u00b7 06:00')).toEqual(['middle dot separator']);
    expect(uiTextProblems('Next \u2192')).toEqual(['arrow glyph']);
    expect(uiTextProblems('content: "\\2190"')).toEqual(['arrow glyph']);
    expect(uiTextProblems('Clean air \u{1F343}')).toEqual(['emoji']);
    expect(uiTextProblems('Sunny \u2600')).toEqual(['emoji']);
    expect(uiTextProblems('<p style={{ color: "red" }}>')).toEqual(['inline style attribute']);
    expect(uiTextProblems('<p style="color: red">')).toEqual(['inline style attribute']);
    expect(uiTextProblems("el.setAttribute('style', 'x')")).toEqual(['inline style attribute']);
  });
});

describe('the stylesheets and UI text', () => {
  const files = repoFiles();

  it('keep every visual rule', () => {
    const sheets = files.filter((file) => /^src\/.*\.css$/.test(file));
    expect(sheets.length).toBeGreaterThan(10);
    expect(
      sheets.flatMap((file) => cssProblems(file, readText(file)).map((rule) => `${file}: ${rule}`)),
    ).toEqual([]);
  });

  it('keep every text rule', () => {
    const shown = files.filter((file) => /^src\/(ui|config)\/.*\.(ts|tsx|css)$|^index\.html$/.test(file));
    expect(shown.length).toBeGreaterThan(20);
    expect(shown.flatMap((file) => uiTextProblems(readText(file)).map((rule) => `${file}: ${rule}`))).toEqual(
      [],
    );
  });
});
