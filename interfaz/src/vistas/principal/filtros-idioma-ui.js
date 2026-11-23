// Pintado de la pestaña Filtros (Ajustes de voz): voz activa, filtro de otros
// idiomas e "Idiomas permitidos" (chips + editor inline). Solo lee estado; no
// cambia la logica de filtrado ni los handlers (toggleLangFilter/toggleDictFilter).
// openDictLangModal/closeDictLangModal conservan su nombre (contrato con el HTML
// y el tour) aunque ya no abren un modal: despliegan/pliegan el editor inline.
import { t } from '../../nucleo/i18n/i18n.js';
import { appSettings } from '../../nucleo/estado/ajustes-app.js';
import { dictFilterEnabled, allowedExtraLangs, alCambiarFiltroIdioma, setAllowedExtraLang } from '../../nucleo/estado/config-runtime.js';
import { VOICE_TO_DICT_LANG_UI, DICT_LANG_NAMES, DICT_LANG_FLAG } from './modales-avisos.js';

const byId = (id) => document.getElementById(id);

function setTexto(el, key) {
  el.dataset.i18n = key;
  el.textContent = t(key);
}

function crearBandera(lang) {
  const img = document.createElement('img');
  img.className = 'flag-icon';
  img.src = 'flags/' + DICT_LANG_FLAG[lang] + '.svg';
  img.alt = '';
  return img;
}

function crearNotaSiempre() {
  const nota = document.createElement('small');
  setTexto(nota, 'filtrosIdioma.alwaysAllowed');
  return nota;
}

function pintarVozActiva() {
  const flag = byId('voiceDropdownFlag');
  if (flag) byId('filtroVozFlag').src = flag.getAttribute('src');
  byId('filtroVozNombre').textContent = byId('voiceDropdownText')?.textContent || '';
}

function crearChip(lang, { siempre }) {
  const chip = document.createElement('span');
  chip.className = 'filtro-chip' + (siempre ? ' siempre' : '');
  chip.append(crearBandera(lang), DICT_LANG_NAMES[lang]);
  if (siempre) chip.append(crearNotaSiempre());
  return chip;
}

function pintarChips(voiceLang) {
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

function crearOpcionIdioma(lang, voiceLang) {
  const esVoz = lang === voiceLang;
  const label = document.createElement('label');
  label.className = 'filtro-opcion' + (esVoz ? ' siempre' : '');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = esVoz || allowedExtraLangs.includes(lang);
  cb.disabled = esVoz;
  cb.dataset.lang = lang;
  if (!esVoz) cb.onchange = () => setAllowedExtraLang(lang, cb.checked);
  const nombre = document.createElement('span');
  nombre.textContent = DICT_LANG_NAMES[lang];
  label.append(cb, crearBandera(lang), nombre);
  if (esVoz) label.append(crearNotaSiempre());
  return label;
}

// Se reconstruye solo al cambiar la voz; si no, se sincronizan los checks para
// no perder el foco del teclado al marcar un idioma.
function pintarLista(voiceLang) {
  const lista = byId('dictLangList');
  if (lista.dataset.voz !== voiceLang) {
    lista.dataset.voz = voiceLang;
    lista.replaceChildren(...Object.keys(DICT_LANG_NAMES).map((lang) => crearOpcionIdioma(lang, voiceLang)));
    return;
  }
  for (const cb of lista.querySelectorAll('input:not(:disabled)')) cb.checked = allowedExtraLangs.includes(cb.dataset.lang);
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
  pintarChips(voiceLang);
  pintarLista(voiceLang);
}

function mostrarEditor(abierto) {
  byId('dictLangPanel').hidden = !abierto;
  byId('btnOpenDictLangModal').setAttribute('aria-expanded', String(abierto));
}

export function openDictLangModal() { mostrarEditor(true); }
export function closeDictLangModal() { mostrarEditor(false); }

export function pintarFiltrosIdioma() {
  pintarVozActiva();
  pintarPermitidos();
}

export function iniciarFiltrosIdioma() {
  alCambiarFiltroIdioma(pintarFiltrosIdioma);
  byId('btnCerrarIdiomas').addEventListener('click', closeDictLangModal);
  pintarFiltrosIdioma();
}
