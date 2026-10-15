// Cliente unico de Moderacion del chat. Nunca lanza: toda respuesta es
// { ok, data, errorKey } (data siempre objeto, errorKey '' si todo fue bien).
const FALLBACK_ERROR_KEY = 'errors.chatGuardUnavailable';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function readJson(response) {
  try {
    const data = await response.json();
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function createChatGuardApi(fetchImpl = (...args) => globalThis.fetch(...args)) {
  async function request(method, url, body) {
    try {
      const init = body === undefined ? { method } : { method, headers: JSON_HEADERS, body: JSON.stringify(body) };
      const response = await fetchImpl(url, init);
      const data = await readJson(response);
      if (response.ok) return { ok: true, data, errorKey: '' };
      return { ok: false, data, errorKey: data.errorKey || FALLBACK_ERROR_KEY };
    } catch {
      return { ok: false, data: {}, errorKey: FALLBACK_ERROR_KEY };
    }
  }

  return {
    getStatus: () => request('GET', '/api/chat-guard/status'),
    getBlockedWords: () => request('GET', '/api/blocked-words'),
    patchConfig: (patch) => request('PATCH', '/api/config', patch),
    addBlockedWord: (word) => request('POST', '/api/block-word', { word }),
    removeBlockedWord: (word) => request('DELETE', '/api/block-word', { word }),
    addAllowedWord: (word) => request('POST', '/api/chat-guard/allowed-words', { word }),
    removeAllowedWord: (word) => request('DELETE', '/api/chat-guard/allowed-words', { word }),
    importBlockedWords: (content, replace = false) => request('POST', '/api/blocked-words/import', { content, replace }),
    exportBlockedWords: () => request('GET', '/api/blocked-words/export'),
    clearBlockedWords: () => request('DELETE', '/api/blocked-words'),
  };
}

export const chatGuardApi = createChatGuardApi();
