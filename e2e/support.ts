import { readFileSync } from 'node:fs';
import { beforeEach } from '@e2e-dev/mobile';
import type { Locator, Screen } from 'e2e';

let installed = false;

// The example's Sample button loads this document; e2e runs from the repo root.
export const SAMPLE_STROKES: number = JSON.parse(readFileSync('example/src/sample.json', 'utf8'))
  .strokes.length;

// Installs the build named by INKPAD_APP_PATH once per run on device targets. Without it, the app must already be on the device.
export function installBuildOnce(): void {
  beforeEach(async (fixtures) => {
    if (fixtures.platform === 'web' || installed || !process.env.INKPAD_APP_PATH) return;
    await fixtures.device.installApp();
    installed = true;
  });
}

export async function boxOf(screen: Screen, testId: string) {
  const node = screen.getByTestId(testId);
  // boundingBox() reads the current tree without waiting, unlike tap() and expect().
  await node.waitFor({ state: 'visible' });
  const box = await node.boundingBox();
  if (!box) throw new Error(`${testId} is not on screen`);
  return box;
}

// Material 3 controls on Android wrap a role node that covers them, so a plain tap() finds no point it may press.
export async function tapCenter(node: Locator): Promise<void> {
  await node.waitFor({ state: 'visible' });
  const box = await node.boundingBox();
  if (!box) throw new Error('tap target is not on screen');
  await node.tap({ position: { x: box.width / 2, y: box.height / 2 } });
}

export async function drawAcross(screen: Screen, testId: string): Promise<void> {
  const box = await boxOf(screen, testId);
  const y = box.y + box.height / 2;
  await screen.swipe({
    from: { x: box.x + box.width * 0.2, y },
    to: { x: box.x + box.width * 0.8, y },
  });
}
