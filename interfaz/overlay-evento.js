import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { crearColaAlertas, programarRetiro, PLATFORM_META } from './compartido/cola-alertas.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { EVENTOS_ALERTA } from './compartido/eventos-alerta.js';

registrarErroresOverlay();

const params = leerParametros();
const vistaPrevia = esVistaPrevia(params);
aplicarParametrosVisuales(params);
const idAlerta = params.get('evento');
const alerta = EVENTOS_ALERTA[idAlerta];
const duracion = intParam(params, 'dur', alerta?.duracion || 4000);
const colorPropio = !!params.get('color');

function crearElemento(clase, texto) {
  const elemento = document.createElement('div');
  elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function crearIcono(evento) {
  const contenedor = crearElemento('icono');
  const imagen = document.createElement('img');
  imagen.alt = '';
  imagen.src = evento.sticker || `icons/${alerta.icono}.svg`;
  if (evento.sticker) imagen.className = 'sticker';
  contenedor.append(imagen);
  return contenedor;
}

function mostrarAlerta(evento, alTerminar) {
  const meta = PLATFORM_META[evento.platform];
  const tarjeta = crearElemento('alert-card');
  if (meta && !colorPropio) tarjeta.style.setProperty('--accent', meta.color);

  const titulo = t(`overlayCat.ov.${idAlerta}.titulo`);
  const accion = t(`overlayCat.alerta.${idAlerta}`);
  const info = crearElemento('info');
  info.append(crearElemento('etiqueta', meta ? `${meta.label} · ${titulo}` : titulo));
  info.append(crearElemento('nombre', alerta.sinUsuario ? accion : (evento.user || t('overlayStr.someone'))));
  if (!alerta.sinUsuario) info.append(crearElemento('accion', accion));
  tarjeta.append(crearIcono(evento), info);

  const valorInsignia = alerta.insignia?.(evento);
  if (valorInsignia) tarjeta.append(crearElemento('insignia', String(valorInsignia)));

  document.body.append(tarjeta);
  if (!vistaPrevia) programarRetiro(tarjeta, evento.duration || duracion, alTerminar); // la vista previa deja la tarjeta fija
}

const cola = crearColaAlertas(mostrarAlerta, { maxPendientes: alerta?.maxPendientes });
const aplicarA11y = iniciarAccesibilidadOverlay();

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  if (!alerta) return;
  if (vistaPrevia) cola.encolar(alerta.muestra);
  conectarWSOverlay((d) => {
    if (d.type === 'config-updated') aplicarA11y(d.config || {});
    else if (alerta.coincide(d)) cola.encolar(d);
  });
});
