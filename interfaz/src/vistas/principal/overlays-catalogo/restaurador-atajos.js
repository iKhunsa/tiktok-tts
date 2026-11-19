// Mantiene registrados, en el proceso principal, los atajos de teclado guardados de las escenas.
// Sin dependencias de la app (todo entra por parametros) para poder probarlo solo.

/**
 * `leerEscenas()` devuelve las escenas de la cuenta activa; `leerApi()`, el puente con Electron (o undefined fuera de
 * Electron); `avisarFallo(escena, resultado)` se llama con cada atajo que, tras reintentar, no se pudo registrar.
 * Devuelve `restaurar()`: registra los atajos de las escenas actuales y quita los de las que ya no estan.
 * Se puede llamar las veces que haga falta (cada vez que se cargan los ajustes de una cuenta): si ya hay una
 * pasada en curso, pide otra al terminar en vez de pisarla.
 */
export function crearRestaurador({ leerEscenas, leerApi, avisarFallo, esperarMs = 3000 }) {
  const registradas = new Set(); // escenas con atajo registrado por esta ventana
  let enCurso = null;
  let repetir = false;

  const registrar = (api, escenas) => Promise.all(escenas.map(async (escena) => {
    const resultado = await api.registerSceneShortcut(escena.id, escena.shortcut).catch((error) => ({ ok: false, error: error.message }));
    if (resultado?.ok) registradas.add(escena.id);
    return { escena, resultado };
  }));
  const fallidas = (intentos) => intentos.filter(({ resultado }) => !resultado?.ok);

  async function sincronizar() {
    const api = leerApi();
    if (!api?.registerSceneShortcut) return;
    const deseadas = (leerEscenas() ?? []).filter((escena) => escena.shortcut);
    for (const id of [...registradas]) {
      if (deseadas.some((escena) => escena.id === id)) continue;
      api.unregisterSceneShortcut?.(id);
      registradas.delete(id);
    }
    let pendientes = fallidas(await registrar(api, deseadas));
    // Un fallo puede ser pasajero (otra app tenia la tecla al arrancar): se reintenta una vez antes de avisar.
    if (pendientes.length) {
      await new Promise((resolver) => { setTimeout(resolver, esperarMs); });
      pendientes = fallidas(await registrar(api, pendientes.map(({ escena }) => escena)));
    }
    pendientes.forEach(({ escena, resultado }) => avisarFallo(escena, resultado));
  }

  return function restaurar() {
    if (enCurso) { repetir = true; return enCurso; }
    enCurso = sincronizar().finally(() => {
      enCurso = null;
      if (repetir) { repetir = false; restaurar(); }
    });
    return enCurso;
  };
}
