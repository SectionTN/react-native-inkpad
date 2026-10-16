import { expect, test } from 'e2e';
import { boxOf, drawAcross, installBuildOnce, SAMPLE_STROKES, tapCenter } from './support';

installBuildOnce();

test('draws, undoes, redoes and clears', async ({ app, screen }) => {
  await app.restart();
  await drawAcross(screen, 'canvas');
  await expect(screen.getByTestId('status')).toContainText('1 stroke');
  await tapCenter(screen.getByTestId('undo'));
  await expect(screen.getByTestId('status')).toContainText('0 strokes');
  await tapCenter(screen.getByTestId('redo'));
  await expect(screen.getByTestId('status')).toContainText('1 stroke');
  await tapCenter(screen.getByTestId('clear'));
  await expect(screen.getByTestId('status')).toContainText('0 strokes');
});

test('erases a stroke the eraser crosses', async ({ app, screen }) => {
  await app.restart();
  await drawAcross(screen, 'canvas');
  await tapCenter(screen.getByTestId('eraser'));
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
  await tapCenter(screen.getByTestId('load-sample'));
  await expect(screen.getByTestId('status')).toContainText(strokes);
  await tapCenter(screen.getByLabel('Export'));
  await expect(screen.getByTestId('export-status')).toContainText('PNG · ');
  await tapCenter(screen.getByText('SVG'));
  await expect(screen.getByTestId('export-status')).toContainText('SVG · ');
  await tapCenter(screen.getByText('JSON'));
  await expect(screen.getByTestId('export-status')).toContainText(strokes);
  await tapCenter(screen.getByTestId('reload'));
  await expect(screen.getByTestId('export-status')).toHaveText(`Reloaded ${strokes}`);
});

test('draws on paper and exports it', async ({ app, screen }) => {
  await app.restart();
  await tapCenter(screen.getByTestId('background-toggle'));
  await expect(screen.getByTestId('status')).toContainText('paper');
  await drawAcross(screen, 'canvas');
  await expect(screen.getByTestId('status')).toContainText('1 stroke');
  await expect(screen.getByTestId('status')).not.toContainText('E_IMAGE_LOAD');
  await tapCenter(screen.getByLabel('Export'));
  await expect(screen.getByTestId('export-status')).toContainText('PNG · ');
});

test('ignores fingers in pencil only mode', async ({ app, screen }) => {
  await app.restart();
  await tapCenter(screen.getByTestId('stylus-toggle'));
  await expect(screen.getByTestId('status')).toContainText('pencil only');
  await drawAcross(screen, 'canvas');
  await tapCenter(screen.getByTestId('stylus-toggle'));
  await expect(screen.getByTestId('status')).not.toContainText('pencil only');
  await drawAcross(screen, 'canvas');
  // The first swipe never counted, so the second one is the only stroke.
  await expect(screen.getByTestId('status')).toContainText('1 stroke');
});
