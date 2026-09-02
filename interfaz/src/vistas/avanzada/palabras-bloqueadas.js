import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';
import { flashSave } from './campos-utils.js';
import { loadMdContent } from './editor-md.js';

let blockedWords = [];

export async function loadBlockedWords() {
  try {
    const res = await fetch('/api/blocked-words');
    const data = await res.json();
    blockedWords = data.words || [];
    renderTags();
  } catch (e) {
    showToast(t('adv.errorLoadBlocked'));
  }
}

export function addBlockedWord() {
  const input = document.getElementById('blockedWordInput');
  const word = input.value.trim().toLowerCase();
  if (!word || blockedWords.includes(word)) { input.value = ''; return; }
  blockedWords.push(word);
  input.value = '';
  renderTags();
}

function removeBlockedWord(word) {
  blockedWords = blockedWords.filter((w) => w !== word);
  renderTags();
}

function renderTags() {
  const container = document.getElementById('blockedWordsTags');
  container.innerHTML = '';

  if (blockedWords.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'tags-empty';
    empty.id = 'blockedEmpty';
    empty.textContent = t('adv.blockedEmpty');
    container.appendChild(empty);
    return;
  }

  blockedWords.forEach((word) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.appendChild(document.createTextNode(word + ' '));
    const remove = document.createElement('span');
    remove.className = 'tag-remove';
    remove.title = 'Eliminar';
    remove.textContent = 'x';
    remove.onclick = () => removeBlockedWord(word);
    tag.appendChild(remove);
    container.appendChild(tag);
  });
}

export async function saveBlockedWords() {
  try {
    // Una sola peticion bulk: el servidor reemplaza la lista completa
    const content = blockedWords.map((w) => `- ${w}`).join('\n');
    const res = await fetch('/api/blocked-words/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(tErr(data, 'adv.errorServerUnavailable'));

    blockedWords = data.words || [];
    renderTags();
    flashSave('btnSaveFilters');
    showToast(t('adv.savedWords'));
    loadMdContent();
  } catch (e) {
    showToast(e.message || t('adv.errorLoadBlocked'));
  }
}

/** editor-md.js necesita sincronizar la lista tras import/upload — sin
 * este setter tendria que reimportar blockedWords y romper el modulo
 * dueño (mismo patron que setTtsRate/setMusicQueue en index.html). */
export function setBlockedWords(words) {
  blockedWords = words;
  renderTags();
}
