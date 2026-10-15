// Convierte Markdown a texto plano legible para el cuadro de licencia del
// instalador NSIS (que solo muestra txt/rtf). Conserva la numeracion ("3.1.").
'use strict';

const WEB_OR_MAIL_TARGET = /^(https?:\/\/|mailto:)/i;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;

function linkToText(label, target) {
  return WEB_OR_MAIL_TARGET.test(target) ? `${label} (${target})` : label;
}

function stripInlineMarkup(line) {
  return line
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, target) => linkToText(label, target))
    .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/gi, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function tableCells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

function tableRowToText(line) {
  const cells = tableCells(line);
  if (cells.every((cell) => TABLE_SEPARATOR_CELL.test(cell))) return null;
  return cells.join(' | ');
}

function blockLineToText(line) {
  if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) return '-'.repeat(60);
  if (TABLE_ROW.test(line)) return tableRowToText(line);
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/^(\s*)[*+]\s+/, '$1- ');
}

function markdownToPlainText(markdown) {
  return markdown
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(blockLineToText)
    .filter((line) => line !== null)
    .map(stripInlineMarkup)
    .join('\r\n')
    .replace(/(\r\n){3,}/g, '\r\n\r\n')
    .trim();
}

module.exports = { markdownToPlainText };
