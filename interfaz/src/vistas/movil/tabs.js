export let activeTab = 'Chat';
export function getActiveTab() { return activeTab; }

export function switchTab(name) {
  activeTab = name;
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById('tab' + name).classList.add('active');
  document.getElementById('nav' + name).classList.add('active');

  if (name === 'Clips') {
    document.getElementById('clipsBadge').classList.remove('show');
  }
}
