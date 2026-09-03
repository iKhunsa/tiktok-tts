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

function toolRows(tools, destructiveEnabled) {
  const byDomain = {};
  for (const tool of tools) (byDomain[tool.domain] = byDomain[tool.domain] || []).push(tool);
  const domains = Object.keys(byDomain).sort();
  return domains.map((d) => {
    const rows = byDomain[d].map((tool) => {
      const isDestr = tool.annotations && tool.annotations.destructiveHint;
      const badges = [];
      if (isDestr) badges.push(`<span class="mcp-badge mcp-badge-danger">${t('mcp.badgeDestructive')}</span>`);
      else if (tool.annotations && tool.annotations.readOnlyHint) badges.push(`<span class="mcp-badge">${t('mcp.badgeReadonly')}</span>`);
      const dim = isDestr && !destructiveEnabled ? ' style="opacity:.45"' : '';
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
    // Lo que realmente se expone por el cable: sin destructivas si el toggle está off.
    const wireTools = info.tools.filter((tl) => destructive || !(tl.annotations && tl.annotations.destructiveHint));
    const shownTools = enabled ? wireTools.length : 0;

    el.innerHTML = `
      <div class="settings-section">
        <div class="settings-section-title"><span data-i18n="mcp.statusHeading">Servidor MCP</span></div>
        <div class="settings-panel">
          <div class="setting-group">
            <label class="toggle-chip ${enabled ? 'active' : ''}" style="width:max-content;">
              <input type="checkbox" id="mcpEnabledToggle" ${enabled ? 'checked' : ''}>
              <img class="icon-inline" src="icons/extension.svg" alt=""> <span data-i18n="mcp.enableLabel">Servidor MCP activo</span>
            </label>
            <p class="setting-hint" data-i18n="mcp.enableHint">Endpoint solo accesible desde esta máquina. Apagado, /mcp responde 503.</p>
          </div>
          <div class="setting-group">
            <label class="toggle-chip ${destructive ? 'active' : ''}" style="width:max-content;">
              <input type="checkbox" id="mcpDestructiveToggle" ${destructive ? 'checked' : ''}>
              <img class="icon-inline" src="icons/warning-amber.svg" alt=""> <span data-i18n="mcp.destructiveLabel">Permitir tools destructivas</span>
            </label>
            <p class="setting-hint" data-i18n="mcp.destructiveHint">Ban/mute/desconectar/borrar. El agente igual pide confirmación en su lado.</p>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title"><span data-i18n="mcp.connectHeading">Conectar un agente</span></div>
        <div class="settings-panel">
          <div class="setting-group">
            <label data-i18n="mcp.endpointLabel">Endpoint</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <code style="flex:1;padding:8px 11px;background:var(--bg-button);border:1px solid var(--border-strong);border-radius:8px;">${url}</code>
              <button class="cfg-btn" id="mcpCopyEndpoint" data-i18n="mcp.copyEndpoint">Copiar</button>
            </div>
          </div>
          <div class="setting-group full">
            <label data-i18n="mcp.snippetClaudeCode">Claude Code (.mcp.json)</label>
            <pre class="mcp-snippet">${snippetClaudeCode(url)}</pre>
            <button class="cfg-btn small" id="mcpCopyCC" data-i18n="btn.copy">Copiar</button>
          </div>
          <div class="setting-group full">
            <label data-i18n="mcp.snippetClaudeDesktop">Claude Desktop (claude_desktop_config.json)</label>
            <pre class="mcp-snippet">${snippetClaudeDesktop(url)}</pre>
            <button class="cfg-btn small" id="mcpCopyCD" data-i18n="btn.copy">Copiar</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">
          <span data-i18n="mcp.toolsHeading">Herramientas disponibles</span>
          <span class="mcp-count">${shownTools}${enabled ? '' : ' · ' + t('mcp.disabledNotice')}</span>
        </div>
        <div class="settings-panel">
          <table class="mcp-tools-table">
            <thead><tr><th data-i18n="mcp.toolColName">Tool</th><th data-i18n="mcp.toolColDesc">Descripción</th></tr></thead>
            <tbody>${enabled ? toolRows(info.tools, destructive) : ''}</tbody>
          </table>
          ${info.lastRequestAt ? `<p class="setting-hint">${t('mcp.clientsLabel')}: ${new Date(info.lastRequestAt).toLocaleString()} (${info.recentRequests})</p>` : ''}
        </div>
      </div>
    `;

    el.querySelector('#mcpEnabledToggle').addEventListener('change', async (e) => {
      await patchConfig({ mcpEnabled: e.target.checked });
      renderMcpPanel();
    });
    el.querySelector('#mcpDestructiveToggle').addEventListener('change', async (e) => {
      await patchConfig({ mcpDestructiveToolsEnabled: e.target.checked });
      renderMcpPanel();
    });
    el.querySelector('#mcpCopyEndpoint').addEventListener('click', () => { copyToClipboard(url); showToast(t('toast.clipboardCopied')); });
    el.querySelector('#mcpCopyCC').addEventListener('click', () => { copyToClipboard(snippetClaudeCode(url)); showToast(t('toast.clipboardCopied')); });
    el.querySelector('#mcpCopyCD').addEventListener('click', () => { copyToClipboard(snippetClaudeDesktop(url)); showToast(t('toast.clipboardCopied')); });

    aplicarTraducciones(el);
  }).catch(() => {
    el.innerHTML = `<div class="settings-section"><p class="setting-hint" data-i18n="mcp.loadError">No se pudo cargar el estado del MCP.</p></div>`;
    aplicarTraducciones(el);
  });
}

export function initMcpView() {
  // nada que inicializar al arranque; el panel se pinta al entrar a la vista.
}
