// Pintado de la pestaña Filtros (Ajustes de voz): voz activa, estado de cada
// filtro e "Idiomas permitidos". Solo lee estado; no cambia la logica de
// filtrado ni los handlers (toggleLangFilter/toggleDictFilter/openDictLangModal).
import { t } from '../../nucleo/i18n/i18n.js';
import { appSettings } from '../../nucleo/estado/ajustes-app.js';
import { langFilterEnabled, dictFilterEnabled, allowedExtraLangs, alCambiarFiltroIdioma } from '../../nucleo/estado/config-runtime.js';
import { VOICE_TO_DICT_LANG_UI, DICT_LANG_NAMES, DICT_LANG_FLAG } from './modales-avisos.js';

const byId = (id) => document.getElementById(id);

function setTexto(el, key) {
  el.dataset.i18n = key;
  el.textContent = t(key);
}

function pintarVozActiva() {
  const flag = byId('voiceDropdownFlag');
  if (flag) byId('filtroVozFlag').src = flag.getAttribute('src');
  byId('filtroVozNombre').textContent = byId('voiceDropdownText')?.textContent || '';
}

function pintarEstado(estadoId, activo) {
  const el = byId(estadoId);
  setTexto(el, activo ? 'filtrosIdioma.on' : 'filtrosIdioma.off');
  el.classList.toggle('on', activo);
}

function crearChip(lang, { siempre }) {
  const chip = document.createElement('span');
  chip.className = 'filtro-chip' + (siempre ? ' siempre' : '');
  const img = document.createElement('img');
  img.className = 'flag-icon';
  img.src = 'flags/' + DICT_LANG_FLAG[lang] + '.svg';
  img.alt = '';
  chip.append(img, DICT_LANG_NAMES[lang]);
  if (siempre) {
    const nota = document.createElement('small');
    setTexto(nota, 'filtrosIdioma.alwaysAllowed');
    chip.append(nota);
  }
  return chip;
}

function pintarPermitidos() {
  const voiceLang = VOICE_TO_DICT_LANG_UI[appSettings.voice] || null;
  const aplica = !!voiceLang;
  // Voz no latina: el filtro por palabras no aplica. Se atenua, pero el valor
  // guardado (toggle + idiomas extra) queda intacto.
  byId('voiceDictFilterGroup').classList.toggle('no-aplica', !aplica);
  byId('dictFilterToggle').disabled = !aplica;
  byId('dictFilterNA').hidden = aplica;
  byId('filtroPermitidos').hidden = !(aplica && dictFilterEnabled);
  if (!aplica) return;

  const chips = byId('filtroChips');
  chips.replaceChildren(crearChip(voiceLang, { siempre: true }));
  const extras = allowedExtraLangs.filter((l) => DICT_LANG_NAMES[l] && l !== voiceLang);
  for (const lang of extras) chips.append(crearChip(lang, { siempre: false }));
  if (!extras.length) {
    const vacio = document.createElement('small');
    vacio.className = 'filtro-vacio';
    setTexto(vacio, 'filtrosIdioma.noExtras');
    chips.append(vacio);
  }
}

export function pintarFiltrosIdioma() {
  pintarVozActiva();
  pintarEstado('langFilterEstado', langFilterEnabled);
  pintarEstado('dictFilterEstado', dictFilterEnabled);
  pintarPermitidos();
}

export function iniciarFiltrosIdioma() {
  alCambiarFiltroIdioma(pintarFiltrosIdioma);
  pintarFiltrosIdioma();
}
