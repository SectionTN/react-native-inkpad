import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';
import { boxOf, drawAcross, installBuildOnce } from './support';

installBuildOnce();

test('draws, undoes, redoes and clears', async ({ app, screen }) => {
  await app.restart();
  await drawAcross(screen, 'canvas');
  await expect(screen.getByTestId('status')).toContainText('strokes: 1');
  await screen.getByTestId('undo').tap();
  await expect(screen.getByTestId('status')).toContainText('strokes: 0');
  await screen.getByTestId('redo').tap();
  await expect(screen.getByTestId('status')).toContainText('strokes: 1');
  await screen.getByTestId('clear').tap();
  await expect(screen.getByTestId('status')).toContainText('strokes: 0');
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
  await expect(screen.getByTestId('status')).toContainText('strokes: 0');
});

test('loads, reloads and exports strokes', async ({ app, screen }) => {
  await app.restart();
  await screen.getByTestId('load-sample').tap();
  await expect(screen.getByTestId('status')).toContainText('strokes: 2');
  await screen.getByTestId('reload').tap();
  await expect(screen.getByTestId('status')).toContainText('last: reloaded 2');
  await screen.getByTestId('export-png').tap();
  await expect(screen.getByTestId('status')).toContainText('last: png ');
  await screen.getByTestId('export-svg').tap();
  await expect(screen.getByTestId('status')).toContainText('last: svg ');
});
