const ESPERA_MS = 900;

/**
 * SOLO FRONTEND: da por cumplida cualquier mision tras una pausa. Es el unico punto a cambiar cuando el backend la
 * compruebe (misma firma: recibe el id y resuelve con true si esta cumplida).
 */
export const verificarMision = () => new Promise((resolver) => setTimeout(() => resolver(true), ESPERA_MS));
