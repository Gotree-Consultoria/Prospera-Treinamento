const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5500;

const projectRoot = __dirname;
const legacyDir = path.join(projectRoot, 'src', 'legacy');
const angularDistDir = path.join(projectRoot, 'dist', 'angular', 'frontend', 'browser');

// Servir build Angular na rota /app quando existir
app.use('/app', express.static(angularDistDir));
app.get('/app/*', (req, res, next) => {
  const angularIndex = path.join(angularDistDir, 'index.html');
  if (fs.existsSync(angularIndex)) {
    return res.sendFile(angularIndex);
  }
  return next();
});

// Servir arquivos legado (HTML estático, módulos JS e CSS)
app.use('/src/legacy', express.static(legacyDir));

// Servir demais assets a partir da raiz do projeto (inclui index.html legado)
app.use(express.static(projectRoot));

// Fallback para index.html legado
app.get('*', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.listen(port, () => {
  console.log(`Dev server listening on http://localhost:${port}`);
  console.log('Legacy app disponível em http://localhost:' + port);
  console.log('Angular app (quando buildado) disponível em http://localhost:' + port + '/app');
});
