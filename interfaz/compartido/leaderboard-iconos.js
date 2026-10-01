/** Iconos propios de los rankings (inline para heredar color y cargar sin red). */

export const CORONA_SVG = '<svg class="corona" viewBox="0 0 24 16" aria-hidden="true"><path d="M2 14.5 0.5 3.5 6.5 8.5 12 0.5 17.5 8.5 23.5 3.5 22 14.5Z" fill="#f6b738"/><rect x="2" y="13" width="20" height="2.5" rx="1" fill="#e59f12"/></svg>';

export const CORAZON_SVG = '<svg class="simbolo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z" fill="#ff3b5c"/></svg>';

export const MONEDA_SVG = '<svg class="simbolo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#ffe08a"/><circle cx="12" cy="12" r="8.5" fill="#f5b800"/><path d="M12 7v10M9.2 9.8h4.2a1.6 1.6 0 0 1 0 3.2H10a1.6 1.6 0 0 0 0 3.2h4.4" fill="none" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round"/></svg>';

// Silueta neutra para quien no tiene foto (o cuya URL firmada de TikTok ya caduco).
export const AVATAR_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3a3d45"/><circle cx="32" cy="25" r="11" fill="#8b909c"/><path d="M10 64c2-15 12-22 22-22s20 7 22 22Z" fill="#8b909c"/></svg>')}`;
