import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // En dev, le serveur Python (server.py) tourne sur le port 8746.
      proxy: {
        '/api': 'http://127.0.0.1:8746',
      },
    },
  };
});
