import { mobile } from '@e2e-dev/mobile';
import { web } from '@e2e-dev/web';
import type { E2EConfig } from 'e2e';

const app = { bundleId: 'me.sectiontn.inkpad.example', appPath: process.env.INKPAD_APP_PATH };
// Serves the export from `yarn e2e:web:build`.
const webApp = {
  url: 'http://localhost:8082',
  command: {
    executable: 'yarn',
    args: ['example', 'expo', 'serve', '--port', '{port}'],
    log: '.e2e/web-server.log',
  },
};

export default {
  tests: ['e2e/**/*.e2e.ts'],
  targets: [
    { name: 'android', engine: mobile({ platform: 'android' }), app },
    // CI names a simulator; locally the booted one is used.
    { name: 'ios', engine: mobile({ platform: 'ios', device: process.env.E2E_IOS_DEVICE }), app },
    { name: 'web', engine: web({ browser: 'chromium' }), app: webApp },
    { name: 'web-webkit', engine: web({ browser: 'webkit' }), app: webApp },
  ],
  workers: 1,
} satisfies E2EConfig;
