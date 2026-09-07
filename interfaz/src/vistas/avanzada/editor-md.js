import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';
import { setBlockedWords } from './palabras-bloqueadas.js';

export async function loadMdContent() {
  try {
    const res = await fetch('/api/blocked-words/export');
    const text = await res.text();
    document.getElementById('mdEditor').value = text;
  } catch (e) {
    showToast(t('adv.errorLoadMd'));
  }
}

export async function saveMdContent() {
  const content = document.getElementById('mdEditor').value;
  try {
    const res = await fetch('/api/blocked-words/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setBlockedWords(data.words || []);
    showToast(t('adv.savedMd'));
  } catch (e) {
    showToast(t('adv.errorSaveMd'));
  }
}

export function uploadMdFile() {
  const input = document.getElementById('mdFileInput');
  const file = input.files[0];
  if (!file) { showToast(t('adv.errorSelectMd')); return; }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const res = await fetch('/api/blocked-words/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: e.target.result }),
      });
      const data = await res.json();
      setBlockedWords(data.words || []);
      document.getElementById('mdEditor').value = e.target.result;
      input.value = '';
      showToast(t('adv.importedMd'));
    } catch (err) {
      showToast(t('adv.errorImportMd'));
    }
  };
  reader.readAsText(file);
}

export function downloadMd() {
  const content = document.getElementById('mdEditor').value || '';
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'blocked-words.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
