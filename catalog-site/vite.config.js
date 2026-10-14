import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset URLs relative, so the build works under any Pages path
// (https://georgsby.github.io/dev-digest-ai-marketplace/ today). Routing is hash-based.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: true },
});
