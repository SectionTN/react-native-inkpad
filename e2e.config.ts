import { mobile } from '@e2e-dev/mobile';
import type { E2EConfig } from 'e2e';

const app = { bundleId: 'me.sectiontn.inkpad.example', appPath: process.env.INKPAD_APP_PATH };

export default {
  tests: ['e2e/**/*.e2e.ts'],
  targets: [
    { name: 'android', engine: mobile({ platform: 'android' }), app },
    { name: 'ios', engine: mobile({ platform: 'ios' }), app },
  ],
  workers: 1,
} satisfies E2EConfig;
