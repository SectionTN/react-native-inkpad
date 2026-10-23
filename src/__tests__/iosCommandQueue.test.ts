import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

it.skipIf(process.platform !== 'darwin')(
  'runs iOS view commands in the order they were sent',
  () => {
    const binary = join(mkdtempSync(join(tmpdir(), 'inkpad-')), 'command_queue_check');
    execFileSync('xcrun', [
      'clang',
      '-fobjc-arc',
      '-Wall',
      '-Werror',
      '-framework',
      'Foundation',
      path('../../ios/INKCommandQueue.m'),
      path('./native/command_queue_check.m'),
      '-o',
      binary,
    ]);
    const run = spawnSync(binary);
    const output = `${run.stdout}${run.stderr}`;
    expect(output).not.toContain('FAIL');
    expect(run.status, output).toBe(0);
  },
  60_000,
);
