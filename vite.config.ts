import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/onnxruntime-web/dist/*.wasm',
            dest: './',
          },
          {
            src: 'node_modules/leaflet/dist/images/*.png',
            dest: './',
          },
        ],
      }),
    ],
    build: {
      outDir: 'reported',
    },
    server: {
      open: '/',
    },
    define: {
      'process.env.VITE_PARSE_APPLICATION_ID': JSON.stringify(env.VITE_PARSE_APPLICATION_ID),
      'process.env.VITE_PARSE_HOST_URL': JSON.stringify(env.VITE_PARSE_HOST_URL),
      'process.env.VITE_PARSE_JAVASCRIPT_KEY': JSON.stringify(env.VITE_PARSE_JAVASCRIPT_KEY),
      'process.env.VITE_BUILD_DATE': JSON.stringify(env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0]),
    },
  };
});