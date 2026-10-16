import { expect, test } from 'e2e';
import { drawAcross, installBuildOnce, tapCenter } from './support';

installBuildOnce();

test('reports an empty pad, then a signature', async ({ app, screen }) => {
  await app.restart();
  await tapCenter(screen.getByText('Sign'));
  await screen.getByTestId('inkpad-confirm').tap();
  await expect(screen.getByTestId('adapter-status')).toHaveText('Sign above first');
  await drawAcross(screen, 'signature-pad');
  await screen.getByTestId('inkpad-confirm').tap();
  await expect(screen.getByTestId('adapter-status')).toHaveText('Confirmed');
  await expect(screen.getByTestId('adapter-data')).toContainText('data:image/png;base64,');
});

test('restores a confirmed signature', async ({ app, screen }) => {
  await app.restart();
  await tapCenter(screen.getByText('Sign'));
  await drawAcross(screen, 'signature-pad');
  await screen.getByTestId('inkpad-confirm').tap();
  await expect(screen.getByTestId('adapter-status')).toHaveText('Confirmed');
  await screen.getByTestId('inkpad-clear').tap();
  await screen.getByTestId('inkpad-confirm').tap();
  await expect(screen.getByTestId('adapter-status')).toHaveText('Sign above first');
  await tapCenter(screen.getByTestId('restore-signature'));
  await expect(screen.getByTestId('adapter-status')).toHaveText('Restored');
  await screen.getByTestId('inkpad-confirm').tap();
  await expect(screen.getByTestId('adapter-status')).toHaveText('Confirmed');
});
