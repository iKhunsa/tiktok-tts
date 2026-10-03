// Filtro por texto sobre usuario, mensaje y motivo (sin distinguir mayusculas).
export function filterEntries(entries, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter((entry) => [entry.nick, entry.text, entry.motivo, entry.platform]
    .some((field) => String(field || '').toLowerCase().includes(needle)));
}
