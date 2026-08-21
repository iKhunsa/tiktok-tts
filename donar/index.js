'use strict';

// No-op documentado: no existe funcionalidad real hoy. Los "creditos de
// donantes" (overlayState.credits.donors) son gifts de TikTok, ya cubiertos
// en /overlay (Fase 8). Esta carpeta queda lista para cuando se implemente
// donacion economica real (ej. Streamlabs/PayPal) sin tocar /overlay.
module.exports = {
  name: 'donar',

  register() {
    return { rutas: 0, listeners: 0 };
  },
};
