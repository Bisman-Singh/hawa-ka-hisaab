// Tests that the display name lives in one constant, so a rename is one line plus package.json.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../src/config/app.js';

describe('APP_NAME', () => {
  it('is a non-empty display name', () => {
    expect(APP_NAME.trim()).not.toBe('');
  });

  it('appears literally in no other source file or page', () => {
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter((file) => /^(src|api|scripts)\/.*\.(ts|tsx|css)$|^index\.html$/.test(file) && existsSync(file));
    const holders = files.filter((file) => readFileSync(file, 'utf8').includes(APP_NAME));
    expect(holders).toEqual(['src/config/app.ts']);
  });

  it('is filled into the page title by the build', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<title>%APP_NAME%</title>');
  });
});
