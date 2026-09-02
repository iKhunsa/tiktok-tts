export function downloadAllLogs() {
  const a = document.createElement('a');
  a.href = '/api/logs/download-all';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
