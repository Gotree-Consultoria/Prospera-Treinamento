# Funcionalidades Removidas

## Organizações (Página Corporativa)

Data: 2025-10-02
Motivo: Requisito de produto: navegação não terá mais a seção de Organizações.

### Ações Executadas
- Rota `/organizacoes` removida de `app.routes.ts`.
- Componentes e assets relacionados serão removidos do bundle na próxima limpeza de diretórios.

### Próximos Passos (Opcional)
- Excluir fisicamente a pasta `features/organizations` se não houver dependências futuras.
- Verificar se documentação externa (site, marketing, deep-links) faz referência à URL antiga e atualizar redirecionamentos.

### Rollback Rápido
Para restaurar, recuperar o commit anterior ou reintroduzir a rota:
```ts
{
  path: 'organizacoes',
  loadComponent: () => import('./features/organizations/organizations.component').then(m => m.OrganizationsComponent),
  data: { title: 'Organizações' }
}
```
