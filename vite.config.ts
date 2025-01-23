import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'custom-mime-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url
          if(!url) {
            next()
          }
          if (url?.endsWith('.onnx')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      },
    },
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/*.wasm',
          dest: './'
        },
        {
          src: 'node_modules/leaflet/dist/images/*.png',
          dest: './'
        }
      ]
    })
  ],
  build: {
    outDir: 'reported',
    rollupOptions: {
      
    }
  },

  server: {
    open: '/'
  },
})
