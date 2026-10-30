const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

/** '#rrggbb' en minusculas, o null si el texto no es un color. Acepta '#abc' y sin almohadilla. */
export function normalizarHex(texto) {
  const coincidencia = HEX.exec(texto.trim());
  if (!coincidencia) return null;
  const digitos = coincidencia[1].toLowerCase();
  return `#${digitos.length === 3 ? [...digitos].map((d) => d + d).join('') : digitos}`;
}

/** { h: 0-360, s: 0-1, v: 0-1 } de un '#rrggbb'. */
export function hexAHsv(hex) {
  const [r, g, b] = [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16) / 255);
  const maximo = Math.max(r, g, b);
  const delta = maximo - Math.min(r, g, b);
  let tono = 0;
  if (delta && maximo === r) tono = ((g - b) / delta + 6) % 6;
  else if (delta && maximo === g) tono = (b - r) / delta + 2;
  else if (delta) tono = (r - g) / delta + 4;
  return { h: tono * 60, s: maximo ? delta / maximo : 0, v: maximo };
}

export function hsvAHex({ h, s, v }) {
  const canal = (n) => {
    const k = (n + h / 60) % 6;
    const valor = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(valor * 255).toString(16).padStart(2, '0');
  };
  return `#${canal(5)}${canal(3)}${canal(1)}`;
}
