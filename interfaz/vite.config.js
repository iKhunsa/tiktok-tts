import { defineConfig } from 'vite';
import { resolve } from 'path';

const entry = (name) => resolve(__dirname, name);

// Multi-entry: Vite conserva los nombres de archivo de las entradas, asi
// que las URLs que ya usa OBS (/overlay-chat.html?...) y las que genera
// buildOverlayUrl() en index.html no cambian.
export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, 'publico'),
  base: '/',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: entry('index.html'),
        advanced: entry('advanced.html'),
        mobile: entry('mobile.html'),
        'overlay-alertas': entry('overlay-alertas.html'),
        'overlay-alertas-social': entry('overlay-alertas-social.html'),
        'overlay-chat': entry('overlay-chat.html'),
        'overlay-creditos': entry('overlay-creditos.html'),
        'overlay-likes': entry('overlay-likes.html'),
        'overlay-seguidores': entry('overlay-seguidores.html'),
        'overlay-social': entry('overlay-social.html'),
      },
    },
  },
  // Nota: el cliente WS de la app se conecta a `location.host` sin path
  // propio (comparte origen con el HTTP). En `vite dev` eso choca con el
  // WS de HMR de Vite (tambien en la raiz), asi que el proxy de abajo
  // sirve para las llamadas REST durante desarrollo en navegador; para
  // probar el WS real (chat, TTS, moderacion) usar `vite build --watch`
  // y abrir la app contra Express en :3000 (que es ademas lo que hace
  // Electron siempre, en dev y en produccion).
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/locales': 'http://127.0.0.1:3000',
      '/gifts': 'http://127.0.0.1:3000',
      '/sounds': 'http://127.0.0.1:3000',
      '/icons': 'http://127.0.0.1:3000',
      '/gift-dict.json': 'http://127.0.0.1:3000',
      '/uploads': 'http://127.0.0.1:3000',
    },
  },
});
