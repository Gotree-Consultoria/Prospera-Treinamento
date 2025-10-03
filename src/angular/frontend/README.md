# Frontend — Refatoração para Angular

Este diretório contém a versão refatorada do frontend da Prospera, migrado do antigo SPA baseado em HTML parciais e scripts para um aplicativo moderno em Angular (Angular CLI).

O objetivo da refatoração foi organizar o código em componentes e serviços, melhorar a manutenção, habilitar ferramentas de desenvolvimento (lint, testes, build) e facilitar deploys automatizados.

## O que mudou

- Migração do SPA estático (partials + scripts) para um projeto Angular estruturado em `src/angular/frontend/`.
- Separação clara entre apresentação (componentes), lógica (serviços) e rotas (módulos lazy-loaded quando aplicável).
- Artefatos e dependências (ex.: `node_modules/`, `dist/`, `.angular/`) são ignorados no Git. As regras de ignore estão em `src/angular/frontend/.gitignore`.

## Executando localmente (desenvolvimento)

Abra um PowerShell na pasta do frontend e execute:

```powershell
cd src\angular\frontend
npm ci
npm start
```

Em seguida, abra `http://localhost:4200/` no navegador. O servidor de desenvolvimento do Angular fará hot-reload ao salvar alterações.

Se preferir usar o Angular CLI diretamente:

```powershell
npx ng serve
```

### Gerar artefatos de produção

```powershell
npm run build -- --configuration production
```

Os arquivos otimizados ficarão em `src/angular/frontend/dist/`.

## Testes

- Unitários: `npm test` (Karma/Jasmine ou equivalente, conforme configuração do projeto).
- E2E: `npm run e2e` (se houver configuração de teste E2E).

## Boas práticas e recomendações

- Use componentes e serviços para separar responsabilidades.
- Prefira lazy-loading de módulos para rotas volumosas.
- Mantenha as regras de lint e formatação (ESLint / Prettier) ativas no CI.

## Acesso ao Projeto Online

Você pode visualizar o projeto em tempo real através do link abaixo.
Todas as atualizações feitas no repositório são refletidas automaticamente no deploy:

🔗 prospera-treinamento.vercel.app

---

Desenvolvedor: Brehcore
