import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
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
