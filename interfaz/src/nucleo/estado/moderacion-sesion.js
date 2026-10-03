// Mensajes que la moderacion bloqueo/silencio/detecto en ESTA sesion. Solo en
// memoria del renderer: nunca se persiste ni se envia a telemetria (privacidad:
// no se trata el contenido del chat). El mas viejo sale al pasar el tope.
export const MAX_MODERATION_ENTRIES = 200;

export function createModerationSession(max = MAX_MODERATION_ENTRIES) {
  let entries = [];
  const counts = { blocked: 0, shadow: 0 };
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    add(entry) {
      entries.push(entry);
      if (entries.length > max) entries.shift();
      counts[entry.accion === 'shadow' ? 'shadow' : 'blocked']++;
      notify();
    },
    clear() {
      entries = [];
      counts.blocked = 0;
      counts.shadow = 0;
      notify();
    },
    list: () => entries.slice(),
    counts: () => ({ ...counts }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const moderationSession = createModerationSession();
