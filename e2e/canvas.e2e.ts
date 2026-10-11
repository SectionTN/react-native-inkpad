import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';
import { boxOf, drawAcross, installBuildOnce, SAMPLE_STROKES } from './support';

installBuildOnce();

test('draws, undoes, redoes and clears', async ({ app, screen }) => {
  await app.restart();
  await drawAcross(screen, 'canvas');
  await expect(screen.getByTestId('status')).toContainText('1 stroke');
  await screen.getByTestId('undo').tap();
  await expect(screen.getByTestId('status')).toContainText('0 strokes');
  await screen.getByTestId('redo').tap();
  await expect(screen.getByTestId('status')).toContainText('1 stroke');
  await screen.getByTestId('clear').tap();
  await expect(screen.getByTestId('status')).toContainText('0 strokes');
});

test('erases a stroke the eraser crosses', async ({ app, screen }) => {
  await app.restart();
  await drawAcross(screen, 'canvas');
  await screen.getByTestId('eraser').tap();
  const box = await boxOf(screen, 'canvas');
  const x = box.x + box.width / 2;
  await screen.swipe({
    from: { x, y: box.y + box.height * 0.2 },
    to: { x, y: box.y + box.height * 0.8 },
  });
  await expect(screen.getByTestId('status')).toContainText('0 strokes');
});

test('loads the sample, exports it and loads it back', async ({ app, screen }) => {
  const strokes = `${SAMPLE_STROKES} strokes`;
  await app.restart();
  await screen.getByTestId('load-sample').tap();
  await expect(screen.getByTestId('status')).toContainText(strokes);
  await screen.getByLabel('Export').tap();
  await expect(screen.getByTestId('export-status')).toContainText('PNG · ');
  await screen.getByText('SVG').tap();
  await expect(screen.getByTestId('export-status')).toContainText('SVG · ');
  await screen.getByText('JSON').tap();
  await expect(screen.getByTestId('export-status')).toContainText(strokes);
  await screen.getByTestId('reload').tap();
  await expect(screen.getByTestId('export-status')).toHaveText(`Reloaded ${strokes}`);
});
