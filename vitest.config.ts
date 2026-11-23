import { defineConfig } from 'vitest/config';

// The design conformance draws hundreds of pictures beside the other files, so a command test gets more time under load.
export default defineConfig({ test: { include: ['test/**/*.test.ts'], testTimeout: 90000 } });
