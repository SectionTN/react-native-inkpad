import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';
import { drawAcross, installBuildOnce } from './support';

installBuildOnce();

test('reports an empty pad, then a signature', async ({ app, screen }) => {
  await app.restart();
  await screen.getByTestId('adapter-tab').tap();
  await screen.getByTestId('inkpad-confirm').tap();
  await expect(screen.getByTestId('adapter-status')).toHaveText('empty');
  await drawAcross(screen, 'signature-pad');
  await screen.getByTestId('inkpad-confirm').tap();
  await expect(screen.getByTestId('adapter-status')).toHaveText('ok: data:image/png;base64,');
});
