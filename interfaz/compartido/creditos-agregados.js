/**
 * Creditos del overlay agregados por usuario: un Map usuario -> entrada en
 * vez de un push por evento, asi la memoria crece con los usuarios distintos
 * y no con los eventos. Sin tope: los creditos muestran a TODOS.
 *
 * Acepta tanto eventos sueltos ({user, giftName, count}) como entradas ya
 * agregadas ({user, gifts: [{giftName, count}]}), para no depender de la
 * forma en que el backend guarde/envie los creditos.
 */
export function crearCreditos() {
  let donors = new Map();
  let followers = new Map();
  let sharers = new Map();

  function entrada(mapa, e) {
    const nombre = e.user;
    let x = mapa.get(nombre);
    if (!x) { x = { nombre, avatar: null, regalos: new Map() }; mapa.set(nombre, x); }
    if (e.avatar && !x.avatar) x.avatar = e.avatar;
    return x;
  }

  function sumar(x, giftName, count) {
    x.regalos.set(giftName, (x.regalos.get(giftName) || 0) + (count || 1));
  }

  function agregarDonante(e) {
    const x = entrada(donors, e);
    if (Array.isArray(e.gifts)) e.gifts.forEach((g) => sumar(x, g.giftName, g.count));
    else sumar(x, e.giftName, e.count);
  }

  const agregarSeguidor = (e) => { entrada(followers, e); };
  const agregarSharer = (e) => { entrada(sharers, e); };

  return {
    agregarDonante,
    agregarSeguidor,
    agregarSharer,
    cargar(c = {}) {
      (c.donors || []).forEach(agregarDonante);
      (c.followers || []).forEach(agregarSeguidor);
      (c.sharers || []).forEach(agregarSharer);
    },
    vaciar() { donors = new Map(); followers = new Map(); sharers = new Map(); },
    get donors() { return [...donors.values()]; },
    get followers() { return [...followers.values()]; },
    get sharers() { return [...sharers.values()]; },
  };
}
