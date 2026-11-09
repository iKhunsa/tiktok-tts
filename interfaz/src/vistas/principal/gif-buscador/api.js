// Cliente de las bibliotecas por cuenta: /api/gifs ("Mis GIFs") y /api/sonidos ("Mis sonidos"), mismas rutas.

// Cada llamada devuelve el JSON o lanza Error con `codigo` (el que traduce gifs.error.<codigo>).
export function crearApi(base) {
  async function pedir(metodo, ruta, cuerpo) {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: cuerpo && !(cuerpo instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo instanceof FormData || !cuerpo ? cuerpo : JSON.stringify(cuerpo),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw Object.assign(new Error(datos.error || 'error'), { codigo: datos.codigo || 'descarga_fallida' });
    return datos;
  }
  return {
    listar: () => pedir('GET', ''),
    verificar: () => pedir('POST', '/verificar'),
    borrar: (id) => pedir('DELETE', `/${id}`),
    actualizar: (id, cambios) => pedir('PATCH', `/${id}`, cambios),
    crearCarpeta: (nombre) => pedir('POST', '/carpetas', { nombre }),
    renombrarCarpeta: (id, nombre) => pedir('PATCH', `/carpetas/${id}`, { nombre }),
    borrarCarpeta: (id) => pedir('DELETE', `/carpetas/${id}`),
    subir(archivos) {
      const formulario = new FormData();
      for (const archivo of archivos) formulario.append('archivos', archivo);
      return pedir('POST', '/subir', formulario);
    },
  };
}

export const apiGifs = crearApi('/api/gifs');
export const apiSonidos = { ...crearApi('/api/sonidos'), verificar: undefined }; // los sonidos se copian a disco: no hay enlaces que revisar

export const listarGifs = apiGifs.listar;
export const subirGifs = apiGifs.subir;
