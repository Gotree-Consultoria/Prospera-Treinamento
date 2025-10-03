# Plano de migração completa para Angular

Este plano permite iniciar um novo frontend Angular do zero **sem perder o código legado** atualmente em funcionamento. A estratégia é trabalhar em paralelo, preservando a versão estática até que a nova aplicação esteja pronta para assumir todas as rotas.

## 1. Preparação e versionamento

1. Crie uma branch de migração, por exemplo `feat/angular-migration`.
2. Congele o estado atual em produção/local (tag `legacy-v1`) para referência futura.
3. Documente no `README` o fluxo atual de execução (Express + páginas estáticas) para facilitar suporte durante a transição.

## 2. Estrutura de diretórios

```
src/
  legacy/                # mover todo o site atual para cá
    assets/
    pages/
    scripts/
    styles/
  angular/
    frontend/            # novo workspace Angular criado com CLI
      ...
```

- Atualize `dev-server.js` para servir `src/legacy` como fallback (`/legacy/...`).
- Preserve os caminhos originais movendo os diretórios atuais para `src/legacy`.

## 3. Inicialização do Angular

1. No diretório `src/angular`, gere o workspace:
   ```
   npx @angular/cli@latest new frontend --standalone --routing --style=scss
   ```
2. Ajuste `angular.json` para que o output (`outputPath`) seja `../../dist/angular/frontend`.
3. Crie scripts no `package.json` raiz:
   ```json
   "start:ng": "cd src/angular/frontend && ng serve",
   "build:ng": "cd src/angular/frontend && ng build",
   "test:ng": "cd src/angular/frontend && ng test"
   ```

## 4. Integração com Express

- No `dev-server.js`, adicione uma rota para servir o bundle Angular:
  ```js
  app.use('/app', express.static(path.join(__dirname, 'dist/angular/frontend/browser')));
  app.get('/app/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/angular/frontend/browser/index.html'));
  });
  ```
- Mantenha as rotas legadas respondendo normalmente (`/`, `/catalogo`, etc.) até que cada uma seja portada.

## 5. Migração incremental por domínio

1. **Design System**: implemente `Header`, `Footer`, `Button`, `Card` em `app/shared/components`.
2. **Serviços**: converta os módulos de `src/legacy/scripts/modules/shared` em `app/core/services` tipados (HTTP interceptors para auth/cache).
3. **Features prioritárias**: escolha um domínio (ex.: catálogo) e recrie em `app/features/catalog` com rotas lazy e resolvers.
4. **Dados compartilhados**: use `inject()` e `signal`/`computed` para stores simples; avalie NgRx apenas se necessário.
5. **A/B (convivência)**: enquanto a nova rota não estiver concluída, continue servindo a página legada correspondente.

## 6. Portabilidade de conteúdo

- Imagens e PDFs: mova-os para `src/angular/frontend/src/assets` e atualize referências.
- Traduções: crie estrutura `assets/i18n` para Angular; mantenha arquivos originais em `legacy` até migração completa.
- Estilos globais: converta tokens atuais para SCSS (ex.: `_utilities.css` → `src/legacy/styles/_tokens.scss`).

## 7. Testes e qualidade

- Configure lint (`ng lint`), unit tests (`ng test`) e E2E (Cypress/Playwright).
- Para o legado, mantenha smoke tests mínimos garantindo que o servidor continua servindo as páginas não migradas.
- Adote CI com jobs separados `legacy` e `angular` enquanto ambos coexistirem.

## 8. Cutover final

1. Após migrar todas as páginas, atualize o Express para redirecionar `/` para `/app` e remova as rotas legadas.
2. Arquive o diretório `src/legacy` (ou mantenha como referência histórica).
3. Atualize documentação (README, diagramas, onboarding) apontando apenas para o novo fluxo Angular.

## 9. Checklist rápido

- [ ] Branch e tag criadas (`legacy-v1`)
- [ ] Código legado movido para `src/legacy`
- [ ] Workspace Angular inicializado e rodando (`ng serve`)
- [ ] Design system (header/footer/botões) portado
- [ ] Integração Express configurada (`/app`)
- [ ] Primeira feature migrada e validada
- [ ] Pipelines (lint/test/build) configuradas
- [ ] Cutover final executado e documentado

Seguindo estes passos você consegue reconstruir o frontend do zero com Angular, mantendo o site atual rodando localmente e em produção até que a nova versão esteja madura para assumir todas as responsabilidades.
