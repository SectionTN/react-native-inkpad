import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
// The UDID of a booted iOS simulator; the check runs inside it, without touching the screen.
const simulator = process.env.INKPAD_IOS_SIMULATOR;

it.skipIf(!simulator)(
  'decodes and encodes the shared fixtures on iOS',
  () => {
    const sdk = execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'])
      .toString()
      .trim();
    const binary = join(mkdtempSync(join(tmpdir(), 'inkpad-')), 'ios_codec_check');
    const sources = ['INKStrokeCodec.m', 'INKPenModel.c', 'INKColor.m', 'INKBrushes.m'].map(
      (file) => path(`../../ios/${file}`),
    );
    execFileSync('xcrun', [
      '-sdk',
      'iphonesimulator',
      'clang',
      '-target',
      'arm64-apple-ios17.0-simulator',
      '-isysroot',
      sdk,
      '-fobjc-arc',
      '-fmodules',
      '-framework',
      'UIKit',
      '-framework',
      'PencilKit',
      ...sources,
      path('./native/ios_codec_check.m'),
      '-o',
      binary,
    ]);
    const run = spawnSync('xcrun', [
      'simctl',
      'spawn',
      simulator as string,
      binary,
      path('../__fixtures__/pen-widths.json'),
    ]);
    const output = `${run.stdout}${run.stderr}`;
    expect(output).not.toContain('FAIL');
    expect(run.status, output).toBe(0);
  },
  120_000,
);
