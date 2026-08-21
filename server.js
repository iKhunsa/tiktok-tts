// PLACEHOLDER TEMPORAL — reemplazado fase a fase, ver /plan-fases
'use strict';

const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (_req, res) => {
  res.json({ ok: true, placeholder: true });
});

app.listen(PORT, () => {
  console.log(`[placeholder] server escuchando en http://127.0.0.1:${PORT}`);
});
