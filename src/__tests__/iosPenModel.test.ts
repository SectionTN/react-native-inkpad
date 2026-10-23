import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

type FixtureStroke = {
  name: string;
  brush: string;
  input: string;
  size: number;
  points: number[];
  widths: number[];
};

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const fixtures: { strokes: FixtureStroke[] } = JSON.parse(
  readFileSync(path('../__fixtures__/pen-widths.json'), 'utf8'),
);
const TOOLS: Record<string, number> = { touch: 0, mouse: 1, stylus: 2 };
const hasCompiler = spawnSync('cc', ['--version']).status === 0;

describe.skipIf(!hasCompiler)('INKPenWidths', () => {
  let binary = '';

  beforeAll(() => {
    binary = join(mkdtempSync(join(tmpdir(), 'inkpad-')), 'pen_widths');
    execFileSync('cc', [
      '-std=c11',
      '-O2',
      '-Wall',
      '-Wextra',
      '-Werror',
      path('../../ios/INKPenModel.c'),
      path('./native/pen_widths_driver.c'),
      '-lm',
      '-o',
      binary,
    ]);
  });

  const pens = fixtures.strokes.filter((stroke) => stroke.brush === 'pen');

  it.each(pens.map((stroke) => [stroke.name, stroke] as const))(
    'matches the %s fixture',
    (_, stroke) => {
      const count = stroke.points.length / 6;
      const rows: string[] = [`${TOOLS[stroke.input]} ${stroke.size} ${count}`];
      for (let i = 0; i < count; i++) rows.push(stroke.points.slice(i * 6, i * 6 + 6).join(' '));
      const output = execFileSync(binary, { input: rows.join('\n') })
        .toString()
        .trim()
        .split('\n');
      expect(output).toHaveLength(count);
      output.forEach((line, i) => {
        expect(Math.abs(Number(line) - (stroke.widths[i] as number))).toBeLessThan(1e-3);
      });
    },
  );
});
