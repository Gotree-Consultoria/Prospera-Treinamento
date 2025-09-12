const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5500;

// (Removido) Middleware de headers de desenvolvimento — mantido no histórico de commits se precisar reativar

// Servir arquivos estáticos do diretório do projeto
app.use(express.static(path.join(__dirname)));

// Fallback para index.html (rota SPA) — resolve o problema de GET /account retornando 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Dev server listening on http://localhost:${port} — serving index.html for all routes`);
});
