const UMBRAL_PX = 6; // lo que hay que mover el puntero para que sea un arrastre y no un clic
const LADO_MINI_PX = 64; // ancho que alcanza la miniatura mientras se arrastra
const SEPARACION_PX = 14; // cuanto se aparta del cursor (abajo a la derecha) para no tapar la carpeta de destino
const SALIDA_MS = 160;

/**
 * Arrastre propio de un GIF de la biblioteca hacia una carpeta. Se hace con el puntero, no con el arrastre
 * nativo del navegador, porque asi la miniatura puede animarse: al tomar el GIF parte del tamano de la tarjeta
 * y se encoge y se aparta del cursor, para ver con claridad la carpeta sobre la que se va a soltar.
 * Solo se arranca desde la vista previa (no desde el nombre, el selector ni los botones de la tarjeta).
 *
 * `destinoEn(x, y)` devuelve { fila, ... } si bajo el puntero hay una carpeta que acepta GIFs, o null;
 * `alSoltar(destino)` se llama al soltar sobre una. Esc cancela.
 */
export function permitirArrastreGif(vista, { tarjeta, destinoEn, alSoltar }) {
  let gesto = null;

  function crearMiniatura(rect, desdeX, desdeY) {
    const exterior = document.createElement('div');
    exterior.className = 'gif-fantasma';
    Object.assign(exterior.style, { width: `${rect.width}px`, height: `${rect.height}px` });
    const interior = document.createElement('div');
    interior.className = 'gif-fantasma-interior';
    // El origen de la escala es el punto agarrado: al encogerse, ese punto se queda bajo el cursor.
    interior.style.transformOrigin = `${desdeX - rect.left}px ${desdeY - rect.top}px`;
    const medio = vista.querySelector('.gif-medio');
    if (medio) interior.append(medio.cloneNode(true));
    exterior.append(interior);
    document.body.append(exterior);
    // Dos cuadros: primero a tamano real, luego la escala final, para que la transicion se vea.
    const escala = Math.min(0.5, LADO_MINI_PX / rect.width);
    // Ademas de encogerse, la miniatura se aparta del cursor: asi no tapa la carpeta sobre la que se va a soltar.
    const aparteX = (rect.width * escala) / 2 + SEPARACION_PX - (rect.width / 2 - (desdeX - rect.left)) * escala;
    const aparteY = (rect.height * escala) / 2 + SEPARACION_PX - (rect.height / 2 - (desdeY - rect.top)) * escala;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      interior.style.transform = `scale(${escala})`;
      interior.style.translate = `${aparteX}px ${aparteY}px`;
    }));
    return { exterior, interior, rect };
  }

  function colocar(evento) {
    const { miniatura, desdeX, desdeY } = gesto;
    miniatura.exterior.style.transform = `translate(${evento.clientX - (desdeX - miniatura.rect.left)}px, ${evento.clientY - (desdeY - miniatura.rect.top)}px)`;
  }

  function resaltar(evento) {
    const destino = destinoEn(evento.clientX, evento.clientY);
    if (destino?.fila !== gesto.sobre?.fila) {
      gesto.sobre?.fila.classList.remove('destino');
      destino?.fila.classList.add('destino');
    }
    // Siempre el ultimo punto: quien recibe el GIF (el canvas) lo coloca donde se suelta, no donde entro.
    gesto.sobre = destino;
  }

  function terminar(soltar) {
    if (!gesto) return;
    const { miniatura, sobre } = gesto;
    document.removeEventListener('keydown', alTecla, true);
    sobre?.fila.classList.remove('destino');
    tarjeta.classList.remove('arrastrando');
    if (miniatura) {
      // La miniatura se desvanece sobre la carpeta (o donde se solto, si se cancela).
      Object.assign(miniatura.interior.style, { transform: 'scale(0)', opacity: '0' });
      setTimeout(() => miniatura.exterior.remove(), SALIDA_MS);
    }
    if (gesto.activo) {
      // El navegador envia un clic al soltar sobre el mismo elemento: no es un clic del usuario.
      const bloquear = (evento) => evento.stopImmediatePropagation();
      vista.addEventListener('click', bloquear, { capture: true, once: true });
      setTimeout(() => vista.removeEventListener('click', bloquear, true), 100);
    }
    const aceptado = soltar && gesto.activo && sobre;
    gesto = null;
    if (aceptado) alSoltar(sobre);
  }
  function alTecla(evento) {
    if (evento.key === 'Escape') { evento.stopPropagation(); terminar(false); }
  }

  vista.addEventListener('pointerdown', (evento) => {
    if (evento.button !== 0) return;
    evento.preventDefault(); // sin seleccion de texto ni arrastre nativo de la imagen
    vista.setPointerCapture(evento.pointerId);
    gesto = { desdeX: evento.clientX, desdeY: evento.clientY, activo: false, sobre: null, miniatura: null };
  });
  vista.addEventListener('pointermove', (evento) => {
    if (!gesto) return;
    if (!gesto.activo) {
      if (Math.hypot(evento.clientX - gesto.desdeX, evento.clientY - gesto.desdeY) < UMBRAL_PX) return;
      gesto.activo = true;
      gesto.miniatura = crearMiniatura(vista.getBoundingClientRect(), gesto.desdeX, gesto.desdeY);
      tarjeta.classList.add('arrastrando');
      document.addEventListener('keydown', alTecla, true);
    }
    colocar(evento);
    resaltar(evento);
  });
  vista.addEventListener('pointerup', () => terminar(true));
  vista.addEventListener('pointercancel', () => terminar(false));
}
