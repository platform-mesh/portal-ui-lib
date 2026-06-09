import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-stubs/local-storage.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    server: {
      deps: {
        inline: [/@openmfp\/ngx/],
      },
    },
  },
  resolve: {
    alias: [
      { find: /^gridstack(\/.+)?$/, replacement: '/test-stubs/empty.js' },
    ],
  },
});
