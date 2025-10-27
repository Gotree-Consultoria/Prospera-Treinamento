# Implementação do Visualizador de EBOOKs Seguro

## 📋 Resumo

Implementação de um visualizador de PDFs seguro e acessível para estudantes e administradores visualizarem EBOOKs dentro da plataforma Prospera.

## 🔒 Segurança

### Recursos de Segurança Implementados

1. **Canvas Rendering** - PDFs renderizados em canvas (não como embedded viewer)
   - Impede download direto do arquivo
   - Controle total sobre a visualização

2. **Bloqueio de Keyboard Shortcuts**
   - `Ctrl+S` (Save/Download) - Bloqueado ✅
   - `Ctrl+P` (Print) - Bloqueado ✅
   - `F12` (DevTools) - Bloqueado ✅
   - `Ctrl+Shift+I` (DevTools Inspector) - Bloqueado ✅

3. **Bloqueio de Context Menu**
   - Clique direito desabilitado na área do PDF ✅

4. **Autenticação via HTTP Interceptor**
   - Todos os requests incluem token de autenticação
   - Backend valida credentials antes de servir o PDF

## 🛠️ Stack Técnico

- **Framework**: Angular (Standalone Components)
- **Biblioteca PDF**: `pdfjs-dist` (PDF.js direto)
- **Renderização**: Canvas + TypeScript

## 📁 Arquivos Principais

### Componentes

```
src/app/features/content/
├── content-view.component.ts          # Página principal de visualização
├── pdf-secure-viewer.component.ts     # Componente do visualizador seguro
└── pdf-secure-viewer.component.ts     # Estilos e toolbar
```

### Configuração

```
angular.json                           # Assets configuration para pdf.worker.min.js
tsconfig.app.json                      # TypeScript configuration
app.config.ts                          # Providers da aplicação
app.routes.ts                          # Route: /conteudo/visualizar/:id
```

### Assets

```
src/assets/
└── pdf.worker.min.js                  # Worker do PDF.js (necessário para rendering)
```

## 🔄 Fluxo de Dados

### Para Estudantes (role: USER)

```
1. Estudante clica "Acessar" em um treinamento EBOOK
2. ContentViewComponent carrega detalhes do treinamento
3. Faz request a GET /stream/ebooks/{trainingId}
4. Backend verifica acesso via subscriptions
5. Se aprovado, retorna PDF como blob
6. PdfSecureViewerComponent renderiza em canvas
7. Toolbar permite navegação de páginas e zoom
8. Atalhos e context menu são bloqueados
```

### Para Administradores (role: SYSTEM_ADMIN)

```
1. Admin clica "Acessar" em um treinamento EBOOK
2. ContentViewComponent carrega detalhes (sem restrições)
3. Faz request a GET /stream/ebooks/{trainingId}
4. Backend verifica role = SYSTEM_ADMIN
5. Acesso liberado IMEDIATAMENTE (ignora subscriptions)
6. Resto do fluxo idêntico ao estudante
7. Admin pode:
   - Visualizar todas as páginas do PDF
   - Navegar por aulas via GET /api/lessons/{lessonId}/next
   - Navegar aula anterior via GET /api/lessons/{lessonId}/previous
   - Marcar aulas concluídas via POST /lessons/{lessonId}/complete
```

## 📡 Endpoints Utilizados

### Obrigatórios

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/stream/ebooks/{trainingId}` | Acessar um Ebook | USER, SYSTEM_ADMIN |
| GET | `/api/lessons/{lessonId}/next` | Navegar próxima aula | USER, SYSTEM_ADMIN |
| GET | `/api/lessons/{lessonId}/previous` | Navegar aula anterior | USER, SYSTEM_ADMIN |
| POST | `/lessons/{lessonId}/complete` | Marcar aula concluída | USER, SYSTEM_ADMIN |

### Auxiliares

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/admin/trainings/{id}` | Carregar detalhes do treinamento |
| GET | `/api/me/access-status` | Verificar status de acesso (subscriptions) |

## 🎨 Interface

### Página de Visualização

```
┌─────────────────────────────────────────┐
│                                         │
│    Título do Ebook (Centralizado)       │
│    Autor • EBOOK                        │
│                                         │
├─────────────────────────────────────────┤
│  ← Página Anterior   Página 1 de 50   Próxima Página →
│  🔍+ 🔍− Reset                          │
├─────────────────────────────────────────┤
│                                         │
│  [Canvas com PDF renderizado]           │
│                                         │
│                                         │
└─────────────────────────────────────────┘

Aulas (expandido)
├─ Módulo 1
│  ├─ Aula 1    [Abrir] [← Anterior] [Marcar como Concluída]
│  ├─ Aula 2    [Abrir] [← Anterior] [Marcar como Concluída]
│  └─ Aula 3    [Abrir] [← Anterior] [Marcar como Concluída]
└─ Módulo 2
   └─ ...
```

## ⚙️ Configuração do Worker

### Problema Inicial
- PDF.js requer um worker thread para parsing
- Tentativa de usar CDN falhou com CORS
- Solução: Copiar arquivo local

### Solução Implementada

1. **angular.json** - Copia o worker durante build:
```json
{
  "glob": "pdf.worker.min.js",
  "input": "node_modules/pdfjs-dist/build",
  "output": "assets"
}
```

2. **pdf-secure-viewer.component.ts** - Configura no constructor:
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.js';
```

3. **src/assets/** - Arquivo disponível em runtime

## 🚀 Deployment

### Development
```bash
npm start                 # Hot reload via ng serve
```

### Production
```bash
npm run build            # Gera dist/ com todos os assets
ng build --configuration=production
```

A pasta `dist/` conterá:
- ✅ Todos os chunks JS/CSS da aplicação
- ✅ `assets/pdf.worker.min.js` (copiado automaticamente)
- ✅ Pronto para deploy em qualquer servidor estático

## 🔐 Segurança - Considerações

### DevTools Protection (Parcial)
- ✅ Bloqueia atalhos comuns (Ctrl+S, F12, etc)
- ⚠️ Usuário avançado ainda consegue abrir DevTools manualmente
- ⚠️ Pode usar `Save page as...` via menu File

### Soluções Adicionais (Opcional)
1. **Content-Security-Policy Headers** (backend)
2. **Right-click context menu bloqueado** ✅ (já implementado)
3. **Canvas canvas.toBlob() bloqueado** (adicionar se necessário)
4. **Watermarking** (backend - adicionar timestamp/identificação)

## ✅ Checklist de Testes

- [ ] Login como USER - Acessar EBOOK funciona
- [ ] Login como SYSTEM_ADMIN - Acessar EBOOK funciona (sem subscription check)
- [ ] Teste Ctrl+S - Não faz download
- [ ] Teste Ctrl+P - Não abre print
- [ ] Teste F12 - DevTools não afeta viewer
- [ ] Teste clique direito - Context menu bloqueado
- [ ] Navegação de páginas funciona
- [ ] Zoom in/out funciona
- [ ] Botão "Anterior" navega para aula anterior
- [ ] Botão "Marcar como Concluída" funciona
- [ ] PDF carrega rápido em produção
- [ ] Sem memory leaks (BlobURL revogado em ngOnDestroy)

## 📝 Notas

- PDF.js é a biblioteca mais popular e confiável para isso
- OnPush Change Detection garante performance
- Canvas rendering oferece máximo controle de segurança
- Sem dependências de libs UI (apenas PDF.js)
- Totalmente compatível com Angular 18+ standalone components

## 🔗 Links

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [pdfjs-dist npm](https://www.npmjs.com/package/pdfjs-dist)
- [Angular ChangeDetectionStrategy](https://angular.io/api/core/ChangeDetectionStrategy)
