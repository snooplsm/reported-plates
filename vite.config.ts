import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import react from '@vitejs/plugin-react-swc';
import { networkInterfaces } from 'node:os';

const getLanAddress = () => {
  const addresses = Object.values(networkInterfaces()).flat()
  return addresses.find(address =>
    address?.family === 'IPv4'
    && !address.internal
    && (/^192\.168\./.test(address.address) || /^10\./.test(address.address) || /^172\.(1[6-9]|2\d|3[01])\./.test(address.address))
  )?.address
}

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd());
  const outDir = 'reported';
  const lanAddress = getLanAddress();
  const devLanUrl = lanAddress ? `http://${lanAddress}:5173/` : '';

  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'public/CNAME',
            dest: './',
          },
          {
            src: 'public/*.svg',
            dest: './',
          },
          {
            src: 'public/*.png',
            dest: './',
          },
          {
            src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
            dest: './',
          },
          {
            src: 'public/models/yolov8n-seg.onnx',
            dest: 'models',
          },
          {
            src: 'public/models/nms-yolov8.onnx',
            dest: 'models',
          },
          {
            src: 'public/models/mask-yolov8-seg.onnx',
            dest: 'models',
          },
          {
            src: 'public/models/yolo-v9-t-640-license-plates-end2end.onnx',
            dest: 'models',
          },
          {
            src: 'public/models/reported-plate-class-best.onnx',
            dest: 'models',
          },
          {
            src: 'public/models/global_mobile_vit_v2_ocr.onnx',
            dest: 'models',
          },
          {
            src: 'public/images/**/*',
            dest: 'images',
          },
          {
            src: 'public/video/**/*',
            dest: 'video',
          },
          {
            src: 'node_modules/leaflet/dist/images/*.png',
            dest: './',
          },
        ],
      }),
    ],
    build: {
      outDir,
      copyPublicDir: false,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      open: '/',
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
    define: {
      'process.env.VITE_PARSE_APPLICATION_ID': JSON.stringify(env.VITE_PARSE_APPLICATION_ID),
      'process.env.VITE_PARSE_HOST_URL': JSON.stringify(env.VITE_PARSE_HOST_URL),
      'process.env.VITE_PARSE_JAVASCRIPT_KEY': JSON.stringify(env.VITE_PARSE_JAVASCRIPT_KEY),
      'process.env.VITE_BUILD_DATE': JSON.stringify(env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0]),
      'import.meta.env.VITE_DEV_LAN_URL': JSON.stringify(devLanUrl),
    },
  };
});
