import { beforeEach } from '@e2e-dev/mobile';
import type { Screen } from 'e2e';

let installed = false;

// Installs the build named by INKPAD_APP_PATH once per run. Without it, the app must already be on the device.
export function installBuildOnce(): void {
  beforeEach(async ({ device }) => {
    if (installed || !process.env.INKPAD_APP_PATH) return;
    await device.installApp();
    installed = true;
  });
}

export async function boxOf(screen: Screen, testId: string) {
  const box = await screen.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`${testId} is not on screen`);
  return box;
}

export async function drawAcross(screen: Screen, testId: string): Promise<void> {
  const box = await boxOf(screen, testId);
  const y = box.y + box.height / 2;
  await screen.swipe({
    from: { x: box.x + box.width * 0.2, y },
    to: { x: box.x + box.width * 0.8, y },
  });
}
