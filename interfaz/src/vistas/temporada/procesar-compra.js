const ESPERA_MS = 900;

/**
 * SOLO FRONTEND: da por pagado cualquier paquete tras una pausa y no cobra nada. Es el unico punto a cambiar cuando haya
 * pago real (misma firma: recibe el paquete y resuelve con true si se pago). Antes de publicar no puede quedar asi.
 */
export const procesarCompra = () => new Promise((resolver) => setTimeout(() => resolver(true), ESPERA_MS));
