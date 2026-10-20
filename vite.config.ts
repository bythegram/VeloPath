import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mapsKey =
    env.VITE_GOOGLE_MAPS_API_KEY ||
    env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    env.GOOGLE_MAPS_PLATFORM_KEY ||
    env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';

  if (mapsKey) {
    process.env.VITE_GOOGLE_MAPS_API_KEY = mapsKey;
    process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY = mapsKey;
    process.env.GOOGLE_MAPS_PLATFORM_KEY = mapsKey;
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(mapsKey),
      'import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(mapsKey),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(mapsKey),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(mapsKey),
      'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(mapsKey),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
