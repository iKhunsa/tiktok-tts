import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { copyToClipboard } from '../utils-app.js';

// t() con fallback: si la clave no resuelve (idioma sin ella, o clave inexistente),
// devuelve `fb` en vez del literal de la clave.
function tk(key, fb) {
  const v = t(key);
  return v === key ? fb : v;
}

function endpointURL() {
  return `${location.origin}/mcp`;
}

function snippetClaudeCode(url) {
  return JSON.stringify({ mcpServers: { 'tiktok-tts': { type: 'http', url } } }, null, 2);
}
function snippetClaudeDesktop(url) {
  return JSON.stringify({ mcpServers: { 'tiktok-tts': { command: 'npx', args: ['-y', 'mcp-remote', url] } } }, null, 2);
}

async function patchConfig(patch) {
  try {
    const r = await fetch('/api/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error(String(r.status));
  } catch (_) {
    showToast(t('mcp.saveError'));
  }
}

async function fetchInfo() {
  const r = await fetch('/api/mcp/info');
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

// ¿esta tool va por el cable con la config actual?
function enWire(tool, destructive, dev) {
  if (tool.dev && !dev) return false;
  if (tool.annotations && tool.annotations.destructiveHint && !destructive) return false;
  return true;
}

function toolRows(tools, destructive, dev) {
  const byDomain = {};
  for (const tool of tools) (byDomain[tool.domain] = byDomain[tool.domain] || []).push(tool);
  const domains = Object.keys(byDomain).sort();
  return domains.map((d) => {
    const rows = byDomain[d].map((tool) => {
      const isDestr = tool.annotations && tool.annotations.destructiveHint;
      const badges = [];
      if (tool.dev) badges.push(`<span class="mcp-badge mcp-badge-dev">${tk('mcp.badgeDev', 'dev')}</span>`);
      if (isDestr) badges.push(`<span class="mcp-badge mcp-badge-danger">${t('mcp.badgeDestructive')}</span>`);
      else if (tool.annotations && tool.annotations.readOnlyHint) badges.push(`<span class="mcp-badge">${t('mcp.badgeReadonly')}</span>`);
      const dim = enWire(tool, destructive, dev) ? '' : ' class="mcp-row-off"';
      // Descripción para la UI: clave i18n propia; fallback a la description del
      // schema (inglés, la que ve el agente).
      const desc = tk(`mcp.toolDesc.${tool.name}`, tool.description || '');
      return `<tr${dim}><td><code>${tool.name}</code> ${badges.join(' ')}</td><td>${desc}</td></tr>`;
    }).join('');
    return `<tr class="mcp-domain-row"><td colspan="2">${tk(`mcp.domain.${d}`, d)}</td></tr>${rows}`;
  }).join('');
}

export function renderMcpPanel() {
  const el = document.getElementById('mcpPanel');
  if (!el) return;
  const url = endpointURL();

  fetchInfo().then((info) => {
    const enabled = info.enabled;
    const destructive = info.destructiveEnabled;
    const dev = info.devEnabled;
    const wireCount = enabled ? info.tools.filter((tl) => enWire(tl, destructive, dev)).length : 0;
    const countText = `${wireCount}${enabled ? '' : ' · ' + t('mcp.disabledNotice')}`;

    el.innerHTML = `
      <div class="settings-section">
        <div class="settings-section-title"><span data-i18n="mcp.statusHeading">Servidor MCP</span></div>
        <div class="settings-panel">
          <div class="setting-group">
            <label class="toggle-chip${enabled ? ' active' : ''}" style="width:max-content;">
              <input type="checkbox" id="mcpEnabledToggle"${enabled ? ' checked' : ''}>
              <img class="icon-inline" src="icons/extension.svg" alt=""> <span data-i18n="mcp.enableLabel">Servidor MCP activo</span>
            </label>
            <div class="mcp-hint" data-i18n="mcp.enableHint">Endpoint solo accesible desde esta máquina. Apagado, /mcp responde 503.</div>
          </div>
          <div class="setting-group">
            <label class="toggle-chip${destructive ? ' active' : ''}" style="width:max-content;">
              <input type="checkbox" id="mcpDestructiveToggle"${destructive ? ' checked' : ''}>
              <img class="icon-inline" src="icons/warning-amber.svg" alt=""> <span data-i18n="mcp.destructiveLabel">Permitir herramientas destructivas</span>
            </label>
            <div class="mcp-hint" data-i18n="mcp.destructiveHint">Banear/silenciar/desconectar/borrar. El agente igual pide confirmación en su lado.</div>
          </div>
          <div class="setting-group mcp-full">
            <label class="toggle-chip${dev ? ' active' : ''}" style="width:max-content;">
              <input type="checkbox" id="mcpDevToggle"${dev ? ' checked' : ''}>
              <img class="icon-inline" src="icons/build.svg" alt=""> <span data-i18n="mcp.devLabel">Herramientas de desarrollo</span>
            </label>
            <div class="mcp-hint" data-i18n="mcp.devHint">Inyectar chat/eventos, ver logs crudos, status completo. Solo para debug.</div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title"><span data-i18n="mcp.connectHeading">Conectar un agente</span></div>
        <div class="settings-panel">
          <div class="setting-group">
            <label data-i18n="mcp.endpointLabel">Endpoint</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <code class="mcp-endpoint">${url}</code>
              <button class="cfg-btn" id="mcpCopyEndpoint" data-i18n="mcp.copyEndpoint">Copiar</button>
            </div>
          </div>
          <div class="setting-group mcp-full">
            <label data-i18n="mcp.snippetClaudeCode">Claude Code (.mcp.json)</label>
            <pre class="mcp-snippet">${snippetClaudeCode(url)}</pre>
            <button class="cfg-btn small" id="mcpCopyCC" data-i18n="btn.copy">Copiar</button>
          </div>
          <div class="setting-group mcp-full">
            <label data-i18n="mcp.snippetClaudeDesktop">Claude Desktop (claude_desktop_config.json)</label>
            <pre class="mcp-snippet">${snippetClaudeDesktop(url)}</pre>
            <button class="cfg-btn small" id="mcpCopyCD" data-i18n="btn.copy">Copiar</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title" style="display:flex;justify-content:space-between;align-items:center;">
          <span data-i18n="mcp.toolsHeading">Herramientas disponibles</span>
          <span class="mcp-count">${countText}</span>
        </div>
        <div class="settings-panel mcp-tools-panel">
          <div class="mcp-tools-wrap">
            <table class="mcp-tools-table">
              <thead><tr><th data-i18n="mcp.toolColName">Herramienta</th><th data-i18n="mcp.toolColDesc">Descripción</th></tr></thead>
              <tbody>${enabled ? toolRows(info.tools, destructive, dev) : ''}</tbody>
            </table>
          </div>
          ${info.lastRequestAt ? `<div class="mcp-hint">${t('mcp.clientsLabel')}: ${new Date(info.lastRequestAt).toLocaleString()} (${info.recentRequests})</div>` : ''}
        </div>
      </div>
    `;

    const onToggle = (id, key) => {
      const cb = el.querySelector(id);
      if (cb) cb.addEventListener('change', async (e) => {
        await patchConfig({ [key]: e.target.checked });
        renderMcpPanel();
      });
    };
    onToggle('#mcpEnabledToggle', 'mcpEnabled');
    onToggle('#mcpDestructiveToggle', 'mcpDestructiveToolsEnabled');
    onToggle('#mcpDevToggle', 'mcpDevToolsEnabled');

    const onCopy = (id, text) => {
      const b = el.querySelector(id);
      if (b) b.addEventListener('click', () => { copyToClipboard(text); showToast(t('toast.clipboardCopied')); });
    };
    onCopy('#mcpCopyEndpoint', url);
    onCopy('#mcpCopyCC', snippetClaudeCode(url));
    onCopy('#mcpCopyCD', snippetClaudeDesktop(url));

    aplicarTraducciones(el);
  }).catch(() => {
    el.innerHTML = `<div class="settings-section"><div class="mcp-hint" data-i18n="mcp.loadError">No se pudo cargar el estado del MCP.</div></div>`;
    aplicarTraducciones(el);
  });
}

export function initMcpView() {
  // nada que inicializar al arranque; el panel se pinta al entrar a la vista.
}
