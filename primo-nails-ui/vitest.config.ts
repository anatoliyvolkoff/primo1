import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Vitest config for the storefront unit/component tests. Kept separate from
// vite.config.ts so the Sentry/Tailwind build plugins don't run under tests.
// Component tests use jsdom + @testing-library; specs live in src/**/*.test.tsx.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
