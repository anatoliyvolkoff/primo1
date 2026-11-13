import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import { defineConfig } from 'vite';
import { mockApi } from './src/dev-mock/plugin';

// Sentry source-map upload + release tagging.
//
// The plugin is opt-in: only runs when SENTRY_AUTH_TOKEN is present,
// which keeps local dev builds fast and avoids accidental uploads.
// In CI / Docker build the env vars are passed by the build pipeline
// (see infra/prod/docker-compose.yml ui build args).
const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
  appType: 'spa',
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.VITE_MOCK_API === '1' ? [mockApi()] : []),
    ...(sentryEnabled
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG ?? 'primo-nails',
            project: process.env.SENTRY_PROJECT ?? 'primo-nails-storefront',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            // Tag the release with the git SHA passed in by Docker
            // build (or local export). Sentry uses this to group
            // errors per deploy.
            release: { name: process.env.VITE_SENTRY_RELEASE },
            telemetry: false,
            // Delete the .map files from dist/ after they're uploaded to Sentry
            // so they are never shipped to (or served from) the CDN.
            sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          }),
        ]
      : []),
  ],
  build: {
    // 'hidden' generates source maps for the Sentry upload but omits the
    // `//# sourceMappingURL=` comment from the bundle, so a browser never
    // requests them even before the plugin deletes the .map files above.
    // (Previously `sourcemap: true` emitted that comment AND left the maps in
    // dist/, so they WERE publicly served — the old comment was inaccurate.)
    sourcemap: sentryEnabled ? 'hidden' : false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
