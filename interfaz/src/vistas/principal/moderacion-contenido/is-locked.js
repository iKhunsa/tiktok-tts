// Nivel, modo e idiomas solo se editan con el filtro encendido y el panel cargado.
export function isLocked(state) {
  return state.phase !== 'ready' || !state.status.enabled;
}
