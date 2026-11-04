import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { InkDocument } from '../document';
import { renderSvgWith } from '../render/core';

vi.mock('react-native', () => {
  throw new Error('react-native imported');
});

const doc: InkDocument = {
  version: 1,
  size: { width: 100, height: 60 },
  strokes: [
    {
      brush: { type: 'pen', color: '#1C1C1EFF', size: 3 },
      input: 'touch',
      points: [10, 10, 0, -1, -1, -1, 50, 30, 16, -1, -1, -1],
    },
  ],
};

function resolveFile(from: string, specifier: string): string | undefined {
  const base = resolve(dirname(from), specifier);
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base].find(
    (path) => path.match(/\.tsx?$/) && existsSync(path),
  );
}

function collectSpecifiers(entry: string): string[] {
  const seen = new Set<string>();
  const bare: string[] = [];
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)) {
      const specifier = match[1] as string;
      if (specifier.startsWith('.')) {
        const next = resolveFile(file, specifier);
        if (next) queue.push(next);
      } else {
        bare.push(specifier);
      }
    }
  }
  return bare;
}

describe('react-native-inkpad/svg', () => {
  it('loads without react-native', async () => {
    const entry = await import('../svg');
    expect(typeof entry.renderSVG).toBe('function');
  });

  it('has no react-native import anywhere in its graph', () => {
    const bare = collectSpecifiers(resolve(__dirname, '../svg/index.ts'));
    const offenders = bare.filter((s) => s === 'react-native' || s.startsWith('react-native/'));
    expect(offenders).toEqual([]);
  });

  it('parses CSS colors', async () => {
    const { cssColorToHex } = await import('../svg/cssColor');
    expect(cssColorToHex('white')).toBe('#FFFFFFFF');
    expect(cssColorToHex('rgba(255, 0, 0, 0.5)')).toBe('#FF000080');
    expect(cssColorToHex('#00F')).toBe('#0000FFFF');
  });

  it("throws E_EXPORT_FAILED for a color it can't parse", async () => {
    const { cssColorToHex } = await import('../svg/cssColor');
    expect(() => cssColorToHex('not-a-color')).toThrowError(
      expect.objectContaining({
        code: 'E_EXPORT_FAILED',
        message: 'background.color is not a CSS color: not-a-color',
      }),
    );
  });

  it('matches the root renderSVG', async () => {
    const { renderSVG } = await import('../svg');
    const options = {
      trim: true,
      background: { color: '#FFFFFF', image: { uri: 'https://x/p.png' }, fit: 'cover' as const },
    };
    const expected = renderSvgWith(doc, options, {
      color: () => '#FFFFFFFF',
      image: () => 'https://x/p.png',
    });
    expect(renderSVG(doc, options)).toBe(expected);
  });
});
